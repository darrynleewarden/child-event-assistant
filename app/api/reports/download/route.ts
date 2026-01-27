import { NextRequest, NextResponse } from "next/server"
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { auth } from "@/auth"

// Initialize S3 client
const s3Client = new S3Client({
    region: process.env.AWS_REGION || "ap-southeast-2",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
})

export async function GET(request: NextRequest) {
    try {
        const session = await auth()

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const searchParams = request.nextUrl.searchParams
        const key = searchParams.get("key")

        if (!key) {
            return NextResponse.json({ error: "Missing file key parameter" }, { status: 400 })
        }

        const bucketName = process.env.AWS_S3_REPORTS_BUCKET || ""

        if (!bucketName) {
            return NextResponse.json({ error: "S3 bucket not configured" }, { status: 500 })
        }

        // Generate a presigned URL that expires in 5 minutes
        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: key,
        })

        const presignedUrl = await getSignedUrl(s3Client, command, {
            expiresIn: 300, // 5 minutes
        })

        return NextResponse.json({
            url: presignedUrl,
            expiresIn: 300,
        })
    } catch (error) {
        console.error("Error generating presigned URL:", error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to generate download URL" },
            { status: 500 }
        )
    }
}
