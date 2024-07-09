import {
	PutObjectCommand,
	PutObjectCommandInput,
	S3Client,
} from "@aws-sdk/client-s3";

const s3 = new S3Client();

export const handler = async () => {
	const response = await fetch(
		"https://plus.unsplash.com/premium_photo-1680087014917-904bb37c5191?q=80&w=1935&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
	);

	const blob = await response.blob();

	const arrayBuffer = await blob.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);

	const input: PutObjectCommandInput = {
		Bucket: process.env.BUCKET_NAME!,
		Key: "images/sample/sample.jpg",
		Body: buffer,
		ContentType: "image/jpg",
	};

	const command = new PutObjectCommand(input);
	await s3.send(command);

	return {
		statusCode: 200,
		body: JSON.stringify({
			message: "Hello, World!",
		}),
	};
};
