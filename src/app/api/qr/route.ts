import QRCode from "qrcode";
import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Renders a QR code as SVG for any URL or short text. Used by the reviews screen
 * to print a code that sends customers to the business's review page.
 */
export async function GET(request: NextRequest) {
  const data = request.nextUrl.searchParams.get("data")?.trim() ?? "";
  const download = request.nextUrl.searchParams.get("download") === "1";

  if (!data || data.length > 600) {
    return NextResponse.json({ error: "Provide data between 1 and 600 characters." }, { status: 400 });
  }

  try {
    const svg = await QRCode.toString(data, {
      type: "svg",
      margin: 2,
      width: 512,
      errorCorrectionLevel: "M",
      color: { dark: "#0f172a", light: "#ffffff" },
    });

    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "no-store",
        ...(download ? { "Content-Disposition": 'attachment; filename="bookedout-qr.svg"' } : {}),
      },
    });
  } catch {
    return NextResponse.json({ error: "That text could not be encoded as a QR code." }, { status: 400 });
  }
}
