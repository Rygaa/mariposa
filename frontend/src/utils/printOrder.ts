// src/utils/printOrder.ts
import { jsPDF } from "jspdf";

const mmToPt = (mm: number): number => mm * 2.83465;

export async function generateOrderPDF(order: any): Promise<void> {
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

  const groupedMenuItemOrder = MenuItemOrderContainer.reduce((acc: any, item: any) => {
    const supplements = item.selectedSupplements || [];
    const key = `${item.menuItemId}-${supplements
      .map((s: any) => s.supplementId)
      .sort()
      .join(",")}`;

    const findElement = acc.find((el: any) => el.shallowKey === key);

    if (!findElement) {
      acc.push({
        shallowKey: key,
        ...item,
        quantity: 0,
        finalPrice: 0,
      });

      acc[acc.length - 1].quantity = item.quantity || 1;
      const suppPrice = supplements.reduce((sum: number, supp: any) => sum + (supp.supplement?.price || 0), 0);
      acc[acc.length - 1].finalPriceForOneItem = item.price + suppPrice;
      acc[acc.length - 1].finalPrice = (item.price + suppPrice) * item.quantity;
    } else {
      const itemQty = item.quantity || 1;
      findElement.quantity += itemQty;
      const suppPrice = supplements.reduce((sum: number, supp: any) => sum + (supp.supplement?.price || 0), 0);
      findElement.finalPrice += (item.price + suppPrice) * itemQty;
    }
    return acc;
  }, []);

  for (let i = 0; i < groupedMenuItemOrder.length; i++) {
    const element = groupedMenuItemOrder[i];
    const name = `${element.quantity} ${element.menuItem?.name || 'Unknown Item'}`;
    const supplements = (element.selectedSupplements || [])
      .map((supp: any) => `s: ${supp.supplement?.name || ''}`)
      .filter((s: string) => s)
      .join("\n");
    const menuItemOptions = (element.MenuItemOrderMenuItemOption || [])
      .filter((opt: any) => opt.option?.shouldBePrinted)
      .map((opt: any) => opt.option?.name || '')
      .filter((s: string) => s)
      .join(", ");

    const finalPrice = element.finalPrice;
    grandTotal += finalPrice;

    // Draw item name
    doc.setFont("courier", "bold");
    doc.text(name, 5, yPos);
    yPos += 6;

    // Draw supplements
    if (supplements) {
      doc.setFont("courier", "normal");
      const suppLines = supplements.split("\n");
      suppLines.forEach((line: string) => {
        doc.text(line, 8, yPos);
        yPos += 5;
      });
    }

    // Draw options (with underline effect)
    if (menuItemOptions) {
      doc.setFont("courier", "normal");
      doc.text(menuItemOptions, 8, yPos);
      const textWidth = doc.getTextWidth(menuItemOptions);
      doc.line(8, yPos + 0.5, 8 + textWidth, yPos + 0.5);
      yPos += 6;
    }

    yPos += 3;
  }

  // Line separator
  doc.line(3, yPos, widthMm - 3, yPos);
  yPos += 5;

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
