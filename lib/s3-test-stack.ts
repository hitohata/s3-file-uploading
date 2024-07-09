import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { RemovalPolicy } from "aws-cdk-lib";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as path from "node:path";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as cloudFrontOrigins from "aws-cdk-lib/aws-cloudfront-origins";
import * as iam from "aws-cdk-lib/aws-iam";
import { CfnOriginAccessControl } from "aws-cdk-lib/aws-cloudfront";

export class S3TestStack extends cdk.Stack {
	constructor(scope: Construct, id: string, props?: cdk.StackProps) {
		super(scope, id, props);

		// The code that defines your stack goes here

		const bucket = new cdk.aws_s3.Bucket(this, "Bucket", {
			bucketName: "s3-upload-test-bucket-bucket",
			removalPolicy: RemovalPolicy.DESTROY,
		});

		const uploadFunction = new NodejsFunction(this, "UploadFunction", {
			functionName: "s3-upload-test-uploadFunction",
			entry: path.join(__dirname, "../lambdas/s3-uploader/src/index.ts"),
			depsLockFilePath: path.join(
				__dirname,
				"../lambdas/s3-uploader/package-lock.json",
			),
			environment: {
				BUCKET_NAME: bucket.bucketName,
			},
			handler: "handler",
			runtime: cdk.aws_lambda.Runtime.NODEJS_20_X,
			memorySize: 512,
			timeout: cdk.Duration.seconds(60),
		});

		bucket.grantPut(uploadFunction);

		// this.updateBucketPolicy({ bucket });
		this.cloudFrontDistribution({ bucket });
	}

	/**
	 * Distribution
	 * host/images is connected to "/images" in the S3 Bucket
	 * https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Introduction.html
	 */
	cloudFrontDistribution({ bucket }: { bucket: s3.Bucket }) {
		const bucketOrigin = new cloudFrontOrigins.S3Origin(bucket);

		const distribution = new cloudfront.Distribution(
			this,
			"UploadTestDistribution",
			{
				// disable default origin
				defaultBehavior: {
					origin: bucketOrigin,
					allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
					viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
				},
				httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
			},
		);

		const oac = new CfnOriginAccessControl(this, "OriginAccessControl", {
			originAccessControlConfig: {
				name: "OriginAccessControl",
				originAccessControlOriginType: "s3",
				signingBehavior: "always",
				signingProtocol: "sigv4",
			},
		});

		const cfnDistribution = distribution.node
			.defaultChild as cloudfront.CfnDistribution;

		// remove OAI
		cfnDistribution.addPropertyOverride(
			"DistributionConfig.Origins.0.S3OriginConfig.OriginAccessIdentity",
			"",
		);
		// add OAC
		cfnDistribution.addPropertyOverride(
			"DistributionConfig.Origins.0.OriginAccessControlId",
			oac.attrId,
		);

		// S3 - BucketPolicy
		const contentsBucketPolicyStatement = new iam.PolicyStatement({
			actions: ["s3:GetObject"],
			effect: iam.Effect.ALLOW,
			principals: [new iam.ServicePrincipal("cloudfront.amazonaws.com")],
			resources: [`${bucket.bucketArn}/images/*`],
		});
		// contentsBucketPolicyStatement.addCondition('StringEquals', {
		// 	'AWS:SourceArn': `arn:aws:cloudfront::${this.account.}:distribution/${this.distribution.distributionId}`
		// })
		bucket.addToResourcePolicy(contentsBucketPolicyStatement);

		return distribution;
	}
}
