// src/utils/printReceipt.ts
import { jsPDF } from "jspdf";

const mmToPt = (mm: number): number => mm * 2.83465;

export async function generateReciptPdf(
  MenuItemOrderContainer: any,
  tableName: string
): Promise<void> {
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


  const groupedMenuItemOrder = MenuItemOrderContainer.reduce((acc: any, item: any) => {
    console.log(item)

    // Get supplements from subMenuItems (filter by type SUPPLEMENT)
    const supplements = item.menuItem?.subMenuItems?.filter((sub: any) => 
      sub.subMenuItem?.type?.includes("SUPPLEMENT")
    ) || [];

    // if menuItemIsThesame and all supplements are the same, group them
    const key = `${item.menuItemId}-${supplements
      .map((s: any) => s.subMenuItemId)
      .sort()
      .join(",")}`;

    const findElement = acc.find((el: any) => el.shallowKey === key);

    if (!findElement) {
      acc.push({
        shallowKey: key,
        ...item,
        quantity: 0,
        finalPrice: 0,
        supplements: supplements,
      });

      const supplementsTotal = supplements.reduce(
        (sum: number, sub: any) => sum + (sub.subMenuItem?.price || 0) * sub.quantity, 
        0
      );

      acc[acc.length - 1].quantity = item.quantity;
      acc[acc.length - 1].finalPriceForOneItem = item.price + supplementsTotal;
      acc[acc.length - 1].finalPrice = (item.price + supplementsTotal) * item.quantity;
    } else {
      const supplementsTotal = supplements.reduce(
        (sum: number, sub: any) => sum + (sub.subMenuItem?.price || 0) * sub.quantity, 
        0
      );
      findElement.quantity += item.quantity;
      findElement.finalPrice += (item.price + supplementsTotal) * item.quantity;
    }
    return acc;
  }, []);

  for (let i = 0; i < groupedMenuItemOrder.length; i++) {
    const element = groupedMenuItemOrder[i];
    const name = `${element.quantity} ${element.menuItem.name}`;
    const supplements = element.supplements
      ?.map((sub: any) => {
        const qty = sub.quantity > 1 ? `${sub.quantity}x ` : '';
        const price = (sub.subMenuItem?.price || 0) / 100;
        return `${qty}${sub.subMenuItem?.name} ${price.toFixed(2)}`;
      })
      .join("\n") || "";

    const finalPrice = element.finalPrice / 100; // Convert from cents to dollars
    grandTotal += finalPrice;

    // Print item name in first column
    doc.text(name, itemStartX, yPos);
    
    // Print price in second column (per item)
    const pricePerItem = element.finalPriceForOneItem / 100;
    doc.text(pricePerItem.toFixed(2), priceStartX, yPos);
    
    // Print total in third column
    doc.text(finalPrice.toFixed(2), totalStartX, yPos);
    yPos += 4;

    // Print supplements indented
    if (supplements) {
      const suppLines = supplements.split("\n");
      suppLines.forEach((line: string) => {
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
  const totalStr = `TOTAL: $${grandTotal.toFixed(2)}`;
  doc.text(totalStr, widthMm - 3, yPos, { align: "right" });

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
