// src/utils/printOrder.ts
import { jsPDF } from "jspdf";

function createOrderHTML(order: any): string {
  console.log(order);
  const dateStr = new Date().toLocaleString();
  
  const MenuItemOrderContainer = order.menuItemOrders || [];

  // Build lookup map for faster child access
  const childrenMap = new Map();
  const mainItems = [];
  
  for (let i = 0; i < MenuItemOrderContainer.length; i++) {
    const item = MenuItemOrderContainer[i];
    if (!item.parentMenuItemOrderId) {
      mainItems.push(item);
    } else {
      if (!childrenMap.has(item.parentMenuItemOrderId)) {
        childrenMap.set(item.parentMenuItemOrderId, []);
      }
      childrenMap.get(item.parentMenuItemOrderId).push(item);
    }
  }

  // Group main items with their children
  const itemsWithChildren = mainItems.map((mainItem: any) => {
    const children = childrenMap.get(mainItem.id) || [];
    
    const supplements = [];
    const options = [];
    
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const type = child.menuItem?.type;
      if (type?.includes("SUPPLEMENT")) {
        supplements.push(child);
      } else if (type?.includes("MENU_ITEM_OPTION")) {
        options.push(child);
      }
    }
    
    return { mainItem, supplements, options };
  });

  // Build items HTML
  let itemsHTML = '';
  
  for (let i = 0; i < itemsWithChildren.length; i++) {
    const element = itemsWithChildren[i];
    const mainItem = element.mainItem;
    const itemName = mainItem.menuItem?.name || 'Unknown Item';
    const subName = mainItem.menuItem?.subName || '';
    const name = `${mainItem.quantity} ${itemName}`;
    const supplements = element.supplements;
    const options = element.options;

    itemsHTML += `<div class="item">`;
    itemsHTML += `<div class="item-name">${name}</div>`;
    
    if (subName) {
      itemsHTML += `<div class="item-subname">(${subName})</div>`;
    }

    // Options
    if (options.length > 0) {
      for (let j = 0; j < options.length; j++) {
        const opt = options[j];
        if (opt.menuItem?.shouldPrintInOrder === false) continue;
        
        const optName = opt.menuItem?.name || '';
        const optSubName = opt.menuItem?.subName || '';
        if (optName) {
          itemsHTML += `<div class="option">${optName}</div>`;
          if (optSubName) {
            itemsHTML += `<div class="option-subname">(${optSubName})</div>`;
          }
        }
      }
    }

    // Supplements
    if (supplements.length > 0) {
      for (let j = 0; j < supplements.length; j++) {
        const supp = supplements[j];
        const suppName = supp.menuItem?.name || '';
        const suppSubName = supp.menuItem?.subName || '';
        if (suppName) {
          itemsHTML += `<div class="supplement">s: ${suppName}</div>`;
          if (suppSubName) {
            itemsHTML += `<div class="supplement-subname">(${suppSubName})</div>`;
          }
        }
      }
    }

    itemsHTML += `</div>`;
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
          padding: 10mm;
          background: white;
        }
        .header {
          text-align: center;
          margin-bottom: 8mm;
        }
        .table-name {
          font-size: 28pt;
          font-weight: bold;
          margin-bottom: 3mm;
        }
        .date {
          font-size: 10pt;
          margin-bottom: 3mm;
        }
        .separator {
          border-top: 1px solid #000;
          margin: 3mm 0;
        }
        .item {
          margin-bottom: 3mm;
        }
        .item-name {
          font-size: 13pt;
          font-weight: bold;
        }
        .item-subname {
          font-size: 11pt;
          font-weight: bold;
          padding-left: 2mm;
          margin-top: 1mm;
        }
        .option {
          font-size: 11pt;
          padding-left: 2mm;
          text-decoration: underline;
          margin-top: 1mm;
        }
        .option-subname {
          font-size: 11pt;
          font-weight: bold;
          padding-left: 4mm;
          margin-top: 1mm;
        }
        .supplement {
          font-size: 11pt;
          padding-left: 2mm;
          margin-top: 1mm;
        }
        .supplement-subname {
          font-size: 11pt;
          font-weight: bold;
          padding-left: 5mm;
          margin-top: 1mm;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="table-name">${order.eatingTable.name}</div>
        <div class="date">Date: ${dateStr}</div>
      </div>
      <div class="separator"></div>
      ${itemsHTML}
      <div class="separator"></div>
    </body>
    </html>
  `;
}

function createOrderPDF(order: any): jsPDF {
  // Legacy PDF generation kept for downloadOrderPDF
  console.log(order)
  const widthMm = 80;
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [widthMm, 200],
  });

  let yPos = 10;
  const centerX = widthMm / 2;
  const lineLeft = 3;
  const lineRight = widthMm - 3;

  doc.setFontSize(28);
  doc.setFont("courier", "bold");
  doc.text(order.eatingTable.name, centerX, yPos, { align: "center" });
  yPos += 10;

  const dateStr = new Date().toLocaleString();
  doc.setFontSize(10);
  doc.setFont("courier", "normal");
  doc.text(`Date: ${dateStr}`, centerX, yPos, { align: "center" });
  yPos += 8;

  doc.line(lineLeft, yPos, lineRight, yPos);
  yPos += 5;
  
  const MenuItemOrderContainer = order.menuItemOrders || [];
  const childrenMap = new Map();
  const mainItems = [];
  
  for (let i = 0; i < MenuItemOrderContainer.length; i++) {
    const item = MenuItemOrderContainer[i];
    if (!item.parentMenuItemOrderId) {
      mainItems.push(item);
    } else {
      if (!childrenMap.has(item.parentMenuItemOrderId)) {
        childrenMap.set(item.parentMenuItemOrderId, []);
      }
      childrenMap.get(item.parentMenuItemOrderId).push(item);
    }
  }

  const itemsWithChildren = mainItems.map((mainItem: any) => {
    const children = childrenMap.get(mainItem.id) || [];
    const supplements = [];
    const options = [];
    
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const type = child.menuItem?.type;
      if (type?.includes("SUPPLEMENT")) {
        supplements.push(child);
      } else if (type?.includes("MENU_ITEM_OPTION")) {
        options.push(child);
      }
    }
    
    return { mainItem, supplements, options };
  });

  doc.setFont("courier", "bold");
  doc.setFontSize(13);
  
  for (let i = 0; i < itemsWithChildren.length; i++) {
    const element = itemsWithChildren[i];
    const mainItem = element.mainItem;
    const itemName = mainItem.menuItem?.name || 'Unknown Item';
    const subName = mainItem.menuItem?.subName || '';
    const name = `${mainItem.quantity} ${itemName}`;
    const supplements = element.supplements;
    const options = element.options;

    doc.text(name, 5, yPos);
    yPos += 6;
    
    if (subName) {
      doc.setFontSize(11);
      doc.text(`  (${subName})`, 5, yPos);
      yPos += 5;
      doc.setFontSize(13);
    }

    if (options.length > 0) {
      doc.setFont("courier", "normal");
      doc.setFontSize(11);
      doc.setLineWidth(0.3);
      
      for (let j = 0; j < options.length; j++) {
        const opt = options[j];
        if (opt.menuItem?.shouldPrintInOrder === false) continue;
        
        const optName = opt.menuItem?.name || '';
        const optSubName = opt.menuItem?.subName || '';
        if (optName) {
          const indentedText = `  ${optName}`;
          doc.text(indentedText, 5, yPos);
          const textWidth = doc.getTextWidth(indentedText);
          doc.line(5, yPos + 1, 5 + textWidth, yPos + 1);
          yPos += 5;
          
          if (optSubName) {
            doc.setFont("courier", "bold");
            doc.text(`    (${optSubName})`, 5, yPos);
            doc.setFont("courier", "normal");
            yPos += 4;
          }
        }
      }
      
      doc.setFont("courier", "bold");
      doc.setFontSize(13);
    }

    if (supplements.length > 0) {
      doc.setFont("courier", "normal");
      doc.setFontSize(11);
      
      for (let j = 0; j < supplements.length; j++) {
        const supp = supplements[j];
        const suppName = supp.menuItem?.name || '';
        const suppSubName = supp.menuItem?.subName || '';
        if (suppName) {
          doc.text(`  s: ${suppName}`, 5, yPos);
          yPos += 5;
          
          if (suppSubName) {
            doc.setFont("courier", "bold");
            doc.text(`     (${suppSubName})`, 5, yPos);
            doc.setFont("courier", "normal");
            yPos += 4;
          }
        }
      }
      
      doc.setFont("courier", "bold");
      doc.setFontSize(13);
    }

    yPos += 3;
  }

  doc.line(lineLeft, yPos, lineRight, yPos);
  yPos += 5;

  return doc;
}

export async function generateOrderPDF(order: any): Promise<void> {
  const html = createOrderHTML(order);
  
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

export async function downloadOrderPDF(order: any): Promise<void> {
  const doc = createOrderPDF(order);
  
  // Download the PDF
  const orderId = order.id?.slice(0, 8) || 'order';
  const timestamp = new Date().toISOString().split('T')[0];
  doc.save(`order-${orderId}-${timestamp}.pdf`);
}
