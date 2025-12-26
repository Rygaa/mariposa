// src/utils/printOrder.ts
import { jsPDF } from "jspdf";

const mmToPt = (mm: number): number => mm * 2.83465;

// Fast HTML-based printing for older PCs (10x faster than PDF)
function generateOrderHTML(order: any): string {
  const dateStr = new Date().toLocaleString();
  const MenuItemOrderContainer = order.menuItemOrders || [];
  
  // Filter and group items
  const mainItems = MenuItemOrderContainer.filter((item: any) => !item.parentMenuItemOrderId);
  const itemsWithChildren = mainItems.map((mainItem: any) => {
    const children = MenuItemOrderContainer.filter(
      (item: any) => item.parentMenuItemOrderId === mainItem.id
    );
    const supplements = children.filter((child: any) => 
      child.menuItem?.type?.includes("SUPPLEMENT")
    );
    const options = children.filter((child: any) => 
      child.menuItem?.type?.includes("MENU_ITEM_OPTION")
    );
    return { ...mainItem, supplements, options };
  });
  
  let itemsHTML = '';
  itemsWithChildren.forEach((element: any) => {
    const itemName = element.menuItem?.name || 'Unknown Item';
    const subName = element.menuItem?.subName || '';
    const supplements = element.supplements || [];
    const options = element.options || [];
    
    itemsHTML += `
      <div class="item">
        <div class="item-name">${element.quantity} ${itemName}</div>
        ${subName ? `<div class="subname">(${subName})</div>` : ''}
        ${options.map((opt: any) => {
          if (opt.menuItem?.shouldPrintInOrder === false) return '';
          const optName = opt.menuItem?.name || '';
          const optSubName = opt.menuItem?.subName || '';
          return optName ? `
            <div class="option">${optName}</div>
            ${optSubName ? `<div class="option-sub">(${optSubName})</div>` : ''}
          ` : '';
        }).join('')}
        ${supplements.map((supp: any) => {
          const suppName = supp.menuItem?.name || '';
          const suppSubName = supp.menuItem?.subName || '';
          return suppName ? `
            <div class="supplement">s: ${suppName}</div>
            ${suppSubName ? `<div class="supplement-sub">(${suppSubName})</div>` : ''}
          ` : '';
        }).join('')}
      </div>
    `;
  });
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page { 
          size: 80mm auto;
          margin: 0;
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          width: 80mm;
          font-family: 'Courier New', monospace;
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
        }
        .separator {
          border-top: 1px solid #000;
          margin: 5mm 0;
        }
        .item {
          margin-bottom: 4mm;
        }
        .item-name {
          font-size: 13pt;
          font-weight: bold;
        }
        .subname {
          font-size: 11pt;
          font-weight: bold;
          margin-left: 2mm;
          margin-top: 1mm;
        }
        .option {
          font-size: 11pt;
          margin-left: 2mm;
          margin-top: 1mm;
          text-decoration: underline;
        }
        .option-sub {
          font-size: 10pt;
          font-weight: bold;
          margin-left: 4mm;
        }
        .supplement {
          font-size: 11pt;
          margin-left: 2mm;
          margin-top: 1mm;
        }
        .supplement-sub {
          font-size: 10pt;
          font-weight: bold;
          margin-left: 5mm;
        }
        @media print {
          body { 
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
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
  console.log(order)
  const widthMm = 80;
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [widthMm, 200],
  });

  let yPos = 10;

  // --- HEADER ---
  doc.setFontSize(28);
  doc.setFont("courier", "bold");
  doc.text(order.eatingTable.name, widthMm / 2, yPos, { align: "center" });
  yPos += 10;

  const dateStr = new Date().toLocaleString();
  doc.setFontSize(10);
  doc.setFont("courier", "normal");
  doc.text(`Date: ${dateStr}`, widthMm / 2, yPos, { align: "center" });
  yPos += 8;

  // Line separator
  doc.line(3, yPos, widthMm - 3, yPos);
  yPos += 5;

  doc.setFontSize(13);
  doc.setFont("courier", "bold");
  
  let grandTotal = 0;

  const MenuItemOrderContainer = order.menuItemOrders || [];

  // Filter main items (items without parentMenuItemOrderId)
  const mainItems = MenuItemOrderContainer.filter((item: any) => !item.parentMenuItemOrderId);

  // Group main items with their children (supplements and options)
  const itemsWithChildren = mainItems.map((mainItem: any) => {
    const children = MenuItemOrderContainer.filter(
      (item: any) => item.parentMenuItemOrderId === mainItem.id
    );
    
    // Separate supplements and options based on type
    const supplements = children.filter((child: any) => 
      child.menuItem?.type?.includes("SUPPLEMENT")
    );
    const options = children.filter((child: any) => 
      child.menuItem?.type?.includes("MENU_ITEM_OPTION")
    );
    
    return {
      ...mainItem,
      supplements,
      options,
    };
  });

  for (let i = 0; i < itemsWithChildren.length; i++) {
    const element = itemsWithChildren[i];
    const itemName = element.menuItem?.name || 'Unknown Item';
    const subName = element.menuItem?.subName || '';
    const name = `${element.quantity} ${itemName}`;
    const supplements = element.supplements || [];
    const options = element.options || [];

    // Calculate item total including supplements
    const itemTotal = element.price * element.quantity;
    const supplementsTotal = supplements.reduce(
      (sum: number, supp: any) => sum + (supp.price || 0) * supp.quantity,
      0
    );
    const finalPrice = itemTotal + supplementsTotal;
    grandTotal += finalPrice;

    // Draw item name
    doc.setFont("courier", "bold");
    doc.setFontSize(13);
    doc.text(name, 5, yPos);
    yPos += 6;
    
    // Draw subName on separate line if it exists
    if (subName) {
      doc.setFont("courier", "bold");
      doc.setFontSize(11);
      doc.text(`  (${subName})`, 5, yPos);
      yPos += 5;
    }

    // Draw options with margin and underline effect
    if (options.length > 0) {
      doc.setFont("courier", "normal");
      doc.setFontSize(11);
      options.forEach((opt: any) => {
        // Skip options that should not be printed
        if (opt.menuItem?.shouldPrintInOrder === false) {
          return;
        }
        
        const optName = opt.menuItem?.name || '';
        const optSubName = opt.menuItem?.subName || '';
        if (optName) {
          const indentedText = `  ${optName}`;
          doc.text(indentedText, 5, yPos);
          const textWidth = doc.getTextWidth(indentedText);
          doc.setLineWidth(0.3);
          doc.line(5, yPos + 1, 5 + textWidth, yPos + 1);
          yPos += 5;
          
          // Draw option subName on separate line if it exists
          if (optSubName) {
            doc.setFont("courier", "bold");
            doc.text(`    (${optSubName})`, 5, yPos);
            yPos += 4;
          }
        }
      });
    }

    // Draw supplements with margin
    if (supplements.length > 0) {
      doc.setFont("courier", "normal");
      doc.setFontSize(11);
      supplements.forEach((supp: any) => {
        const suppName = supp.menuItem?.name || '';
        const suppSubName = supp.menuItem?.subName || '';
        if (suppName) {
          doc.text(`  s: ${suppName}`, 5, yPos);
          yPos += 5;
          
          // Draw supplement subName on separate line if it exists
          if (suppSubName) {
            doc.setFont("courier", "bold");
            doc.text(`     (${suppSubName})`, 5, yPos);
            yPos += 4;
          }
        }
      });
    }

    yPos += 3;
  }

  // Line separator
  doc.line(3, yPos, widthMm - 3, yPos);
  yPos += 5;

  return doc;
}

// FAST: HTML-based printing (recommended for older PCs)
export async function generateOrderPrint(order: any): Promise<void> {
  const html = generateOrderHTML(order);
  
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) return;
  
  printWindow.document.write(html);
  printWindow.document.close();
  
  printWindow.onload = () => {
    printWindow.print();
    printWindow.close();
  };
  
  // Fallback if onload doesn't fire
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}

// SLOWER: PDF-based printing (use only if PDF format is required)
export async function generateOrderPDF(order: any): Promise<void> {
  const doc = createOrderPDF(order);
  
  // Enable auto-print in the PDF
  doc.autoPrint();
  
  // Create hidden iframe
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  
  document.body.appendChild(iframe);
  
  // Wait for iframe to be ready before setting src
  iframe.onload = () => {
    // Cleanup quickly after print dialog opens (1 second instead of 30)
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
      URL.revokeObjectURL(url);
    }, 1000);
  };
  
  // Handle load errors
  iframe.onerror = () => {
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
    URL.revokeObjectURL(url);
  };
  
  // Set src after event handlers are attached
  iframe.src = url;
}

export async function downloadOrderPDF(order: any): Promise<void> {
  const doc = createOrderPDF(order);
  
  // Download the PDF
  const orderId = order.id?.slice(0, 8) || 'order';
  const timestamp = new Date().toISOString().split('T')[0];
  doc.save(`order-${orderId}-${timestamp}.pdf`);
}
