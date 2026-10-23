import { v2 as cloudinary } from "cloudinary";
import { getAdmin } from "@/lib/auth";

/** Signs uploads from the admin's upload widget. Only works with a valid admin session. */
export async function POST(request: Request) {
  if (!(await getAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { paramsToSign } = await request.json();
  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET as string,
  );
  return Response.json({ signature });
}
