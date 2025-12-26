// src/utils/printReceipt.ts
import { jsPDF } from "jspdf";

function createReceiptHTML(
  MenuItemOrderContainer: any,
  tableName: string
): string {
  const dateStr = new Date().toLocaleString();

  // Separate main items from supplements and options
  const mainItems = [];
  const childItemsByParent: { [key: string]: any[] } = {};
  
  for (let i = 0; i < MenuItemOrderContainer.length; i++) {
    const item = MenuItemOrderContainer[i];
    if (!item.parentMenuItemOrderId && item.menuItem?.type?.includes("MENU_ITEM")) {
      mainItems.push(item);
    } else if (item.menuItem?.type?.includes("SUPPLEMENT") && item.parentMenuItemOrderId) {
      if (!childItemsByParent[item.parentMenuItemOrderId]) {
        childItemsByParent[item.parentMenuItemOrderId] = [];
      }
      childItemsByParent[item.parentMenuItemOrderId].push(item);
    }
  }

  let grandTotal = 0;
  let itemsHTML = '';

  for (let i = 0; i < mainItems.length; i++) {
    const item = mainItems[i];
    const childItems = childItemsByParent[item.id] || [];
    
    let childItemsTotal = 0;
    for (let j = 0; j < childItems.length; j++) {
      childItemsTotal += (childItems[j].price || 0) * childItems[j].quantity;
    }

    const finalPriceForOneItem = item.price + childItemsTotal;
    const finalPrice = finalPriceForOneItem * item.quantity;
    grandTotal += finalPrice;

    const itemName = item.menuItem.name;
    const subName = item.menuItem?.subName ? ` (${item.menuItem.subName})` : '';
    const name = `${item.quantity} ${itemName}${subName}`;

    itemsHTML += `
      <tr class="item-row">
        <td class="item-name">${name}</td>
        <td class="price">${finalPriceForOneItem}</td>
        <td class="total">${finalPrice}</td>
      </tr>
    `;

    // Add child items
    for (let j = 0; j < childItems.length; j++) {
      const child = childItems[j];
      const qty = child.quantity > 1 ? `${child.quantity}x ` : '';
      const price = child.price || 0;
      const childSubName = child.menuItem?.subName ? ` (${child.menuItem.subName})` : '';
      const childText = `${qty}${child.menuItem?.name}${childSubName} ${price}`;

      itemsHTML += `
        <tr class="child-row">
          <td class="child-item" colspan="3">${childText}</td>
        </tr>
      `;
    }
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @media print {
          @page { margin: 0; size: 80mm auto; }
          body { margin: 0; }
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Courier New', monospace;
          width: 80mm;
          padding: 10mm 3mm;
          background: white;
        }
        .header {
          text-align: center;
          margin-bottom: 8mm;
        }
        .title {
          font-size: 14pt;
          font-weight: bold;
          margin-bottom: 2mm;
        }
        .subtitle {
          font-size: 10pt;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 9pt;
        }
        .table-header {
          font-weight: bold;
          font-size: 10pt;
          text-align: left;
          border-bottom: 1px solid #000;
          padding-bottom: 1mm;
          padding-top: 2mm;
        }
        .item-row td {
          padding: 1mm 0;
          vertical-align: top;
        }
        .item-name {
          width: 50%;
          padding-right: 2mm;
          word-wrap: break-word;
        }
        .price {
          width: 20%;
          text-align: left;
        }
        .total {
          width: 20%;
          text-align: left;
        }
        .child-row td {
          padding-left: 2mm;
          font-size: 8.5pt;
          padding-top: 0.5mm;
          padding-bottom: 0.5mm;
        }
        .separator {
          border-top: 1px solid #000;
          margin: 2mm 0;
        }
        .grand-total {
          font-size: 12pt;
          font-weight: bold;
          text-align: right;
          margin-top: 5mm;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">Mariposa</div>
        <div class="subtitle">${tableName} - Date: ${dateStr}</div>
      </div>
      
      <table>
        <tr class="table-header">
          <th class="item-name">Item</th>
          <th class="price">Price</th>
          <th class="total">Total</th>
        </tr>
        ${itemsHTML}
      </table>
      
      <div class="separator"></div>
      <div class="grand-total">TOTAL: $${grandTotal}</div>
    </body>
    </html>
  `;
}

function createReceiptPdf(
  MenuItemOrderContainer: any,
  tableName: string
): jsPDF {
  const widthMm = 80;
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [widthMm, 200],
  });

  let yPos = 10;

  // --- HEADER ---
  doc.setFontSize(14);
  doc.setFont("courier", "bold");
  doc.text("Mariposa", widthMm / 2, yPos, { align: "center" });
  yPos += 5;

  const dateStr = new Date().toLocaleString();
  doc.setFontSize(10);
  doc.setFont("courier", "normal");
  doc.text(`${tableName} - Date: ${dateStr}`, widthMm / 2, yPos, { align: "center" });
  yPos += 8;

  // Calculate column positions (in mm)
  const marginX = 3;
  const itemStartX = marginX;
  const priceStartX = 48;
  const totalStartX = 63;
  const itemMaxWidth = priceStartX - itemStartX - 2;

  // --- TABLE HEADER ---
  doc.setFontSize(10);
  doc.setFont("courier", "bold");
  doc.text("Item", itemStartX, yPos);
  doc.text("Price", priceStartX, yPos);
  doc.text("Total", totalStartX, yPos);
  yPos += 2;

  // Line separator
  doc.line(3, yPos, widthMm - 3, yPos);
  yPos += 3;

  doc.setFontSize(9);
  doc.setFont("courier", "normal");

  let grandTotal = 0;


  // Separate main items from supplements and options - optimized with loops
  const mainItems = [];
  const childItemsByParent: { [key: string]: any[] } = {};
  
  for (let i = 0; i < MenuItemOrderContainer.length; i++) {
    const item = MenuItemOrderContainer[i];
    if (!item.parentMenuItemOrderId && item.menuItem?.type?.includes("MENU_ITEM")) {
      mainItems.push(item);
    } else if (item.menuItem?.type?.includes("SUPPLEMENT") && item.parentMenuItemOrderId) {
      if (!childItemsByParent[item.parentMenuItemOrderId]) {
        childItemsByParent[item.parentMenuItemOrderId] = [];
      }
      childItemsByParent[item.parentMenuItemOrderId].push(item);
    }
  }

  const groupedMenuItemOrder = mainItems.map((item: any) => {
    // Get all child items (supplements and options) that were actually ordered for this item
    const childItems = childItemsByParent[item.id] || [];
    
    const childItemsTotal = childItems.reduce(
      (sum: number, child: any) => sum + (child.price || 0) * child.quantity, 
      0
    );

    return {
      ...item,
      childItems: childItems,
      finalPriceForOneItem: item.price + childItemsTotal,
      finalPrice: (item.price + childItemsTotal) * item.quantity,
    };
  });

  for (let i = 0; i < groupedMenuItemOrder.length; i++) {
    const element = groupedMenuItemOrder[i];
    const itemName = element.menuItem.name;
    const subName = element.menuItem?.subName ? ` (${element.menuItem.subName})` : '';
    const name = `${element.quantity} ${itemName}${subName}`;
    
    const finalPrice = element.finalPrice;
    grandTotal += finalPrice;

    // Print item name with text wrapping
    const itemLines = doc.splitTextToSize(name, itemMaxWidth);
    doc.text(itemLines, itemStartX, yPos);
    
    // Print price in second column (aligned with first line)
    const pricePerItem = element.finalPriceForOneItem;
    doc.text(pricePerItem.toString(), priceStartX, yPos);
    
    // Print total in third column (aligned with first line)
    doc.text(finalPrice.toString(), totalStartX, yPos);
    
    // Advance yPos based on wrapped lines
    yPos += itemLines.length * 4;

    // Print child items (supplements and options) with wrapping
    if (element.childItems && element.childItems.length > 0) {
      element.childItems.forEach((child: any) => {
        const qty = child.quantity > 1 ? `${child.quantity}x ` : '';
        const price = (child.price || 0);
        const childSubName = child.menuItem?.subName ? ` (${child.menuItem.subName})` : '';
        const childText = `${qty}${child.menuItem?.name}${childSubName} ${price}`;
        
        const childLines = doc.splitTextToSize(childText, itemMaxWidth - 2);
        doc.text(childLines, itemStartX + 2, yPos);
        yPos += childLines.length * 3.5;
      });
    }

    yPos += 2;
  }

  yPos += 2;

  // Line separator
  doc.line(3, yPos, widthMm - 3, yPos);
  yPos += 5;

  // --- GRAND TOTAL ---
  doc.setFontSize(12);
  doc.setFont("courier", "bold");
  const totalStr = `TOTAL: $${grandTotal}`;
  doc.text(totalStr, widthMm - 3, yPos, { align: "right" });

  return doc;
}

export async function generateReciptPdf(
  MenuItemOrderContainer: any,
  tableName: string
): Promise<void> {
  const html = createReceiptHTML(MenuItemOrderContainer, tableName);
  
  // Create hidden iframe
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  
  document.body.appendChild(iframe);
  
  // Write HTML and trigger print
  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (iframeDoc) {
    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();
    
    // Wait for content to load, then print
    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow?.print();
        
        // Cleanup after print dialog closes
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 100);
    };
  }
}

export function downloadReceiptPdf(
  MenuItemOrderContainer: any,
  tableName: string
): void {
  const doc = createReceiptPdf(MenuItemOrderContainer, tableName);
  doc.save(`receipt-${tableName.replace(/\s+/g, '-')}-${Date.now()}.pdf`);
}
