// src/utils/printReceipt.ts
import { jsPDF } from "jspdf";

const mmToPt = (mm: number): number => mm * 2.83465;

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
  const itemStartX = 3;
  const priceStartX = widthMm * 0.62;
  const totalStartX = widthMm * 0.78;

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


  // Separate main items from supplements and options
  const mainItems = MenuItemOrderContainer.filter((item: any) => 
    !item.parentMenuItemOrderId && item.menuItem?.type?.includes("MENU_ITEM")
  );
  
  // Group child items (supplements and options) by their parent
  const childItemsByParent = MenuItemOrderContainer
  .filter((item: any) => 
    item.menuItem?.type?.includes("SUPPLEMENT")
  )
  .filter((item: any) => 
    item.parentMenuItemOrderId
  ).reduce((acc: any, childItem: any) => {
    if (!acc[childItem.parentMenuItemOrderId]) {
      acc[childItem.parentMenuItemOrderId] = [];
    }
    acc[childItem.parentMenuItemOrderId].push(childItem);
    return acc;
  }, {});

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
    const name = `${element.quantity} ${element.menuItem.name}`;
    
    // Format child items (supplements and options) that were actually ordered for this specific item
    const childItemsText = element.childItems
      ?.map((child: any) => {
        const qty = child.quantity > 1 ? `${child.quantity}x ` : '';
        const price = (child.price || 0);
        return `${qty}${child.menuItem?.name} ${price}`;
      })
      .join("\n") || "";

    const finalPrice = element.finalPrice; // Convert from cents to dollars
    grandTotal += finalPrice;

    // Print item name in first column
    doc.text(name, itemStartX, yPos);
    
    // Print price in second column (per item)
    const pricePerItem = element.finalPriceForOneItem;
    doc.text(pricePerItem.toString(), priceStartX, yPos);
    
    // Print total in third column
    doc.text(finalPrice.toString(), totalStartX, yPos);
    yPos += 4;

    // Print child items (supplements and options) indented
    if (childItemsText) {
      const childLines = childItemsText.split("\n");
      childLines.forEach((line: string) => {
        doc.text(line, itemStartX + 2, yPos);
        yPos += 3.5;
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
  const doc = createReceiptPdf(MenuItemOrderContainer, tableName);
  
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

export function downloadReceiptPdf(
  MenuItemOrderContainer: any,
  tableName: string
): void {
  const doc = createReceiptPdf(MenuItemOrderContainer, tableName);
  doc.save(`receipt-${tableName.replace(/\s+/g, '-')}-${Date.now()}.pdf`);
}
