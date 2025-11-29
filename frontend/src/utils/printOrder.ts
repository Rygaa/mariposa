// src/utils/printOrder.ts
import { jsPDF } from "jspdf";

const mmToPt = (mm: number): number => mm * 2.83465;

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
    const subName = element.menuItem?.subName ? ` (${element.menuItem.subName})` : '';
    const name = `${element.quantity} ${itemName}${subName}`;
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

    // Draw options with margin and underline effect
    if (options.length > 0) {
      doc.setFont("courier", "normal");
      doc.setFontSize(11);
      options.forEach((opt: any) => {
        const optName = opt.menuItem?.name || '';
        const optSubName = opt.menuItem?.subName ? ` (${opt.menuItem.subName})` : '';
        if (optName) {
          const indentedText = `  ${optName}${optSubName}`;
          doc.text(indentedText, 5, yPos);
          const textWidth = doc.getTextWidth(indentedText);
          doc.setLineWidth(0.3);
          doc.line(5, yPos + 1, 5 + textWidth, yPos + 1);
          yPos += 5;
        }
      });
    }

    // Draw supplements with margin
    if (supplements.length > 0) {
      doc.setFont("courier", "normal");
      doc.setFontSize(11);
      supplements.forEach((supp: any) => {
        const suppName = supp.menuItem?.name || '';
        const suppSubName = supp.menuItem?.subName ? ` (${supp.menuItem.subName})` : '';
        if (suppName) {
          doc.text(`  s: ${suppName}${suppSubName}`, 5, yPos);
          yPos += 5;
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

export async function generateOrderPDF(order: any): Promise<void> {
  const doc = createOrderPDF(order);
  
  // Silent printing using hidden iframe for kiosk mode
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  
  // Create hidden iframe
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  document.body.appendChild(iframe);
  
  // Load PDF and print
  iframe.onload = function() {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      
      // Cleanup after printing
      setTimeout(() => {
        document.body.removeChild(iframe);
        URL.revokeObjectURL(url);
      }, 1000);
    } catch (error) {
      console.error("Print error:", error);
      document.body.removeChild(iframe);
      URL.revokeObjectURL(url);
    }
  };
  
  iframe.src = url;
}

export async function downloadOrderPDF(order: any): Promise<void> {
  const doc = createOrderPDF(order);
  
  // Download the PDF
  const orderId = order.id?.slice(0, 8) || 'order';
  const timestamp = new Date().toISOString().split('T')[0];
  doc.save(`order-${orderId}-${timestamp}.pdf`);
}
