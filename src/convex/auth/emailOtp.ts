import { Email } from "@convex-dev/auth/providers/Email";
import { RandomReader, generateRandomString } from "@oslojs/crypto/random";
import { Resend } from "resend";

/**
 * Resend configuration
 *
 * Required Convex environment variables:
 *
 * RESEND_API_KEY
 * RESEND_FROM_EMAIL
 *
 * Example:
 * RESEND_FROM_EMAIL="VerveFit <onboarding@vervefit.app>"
 *
 * Never put RESEND_API_KEY directly in this file.
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;

const RESEND_FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "VerveFit <onboarding@vervefit.app>";

const resend = RESEND_API_KEY
  ? new Resend(RESEND_API_KEY)
  : null;

export const emailOtp = Email({
  id: "email-otp",

  // Verification code expires after 15 minutes.
  maxAge: 60 * 15,

  async generateVerificationToken() {
    const random: RandomReader = {
      read(bytes: Uint8Array) {
        crypto.getRandomValues(bytes);
      },
    };

    const alphabet = "0123456789";

    return generateRandomString(
      random,
      alphabet,
      6,
    );
  },

  async sendVerificationRequest({
    identifier: email,
    token,
  }) {
    const siteUrl = process.env.SITE_URL ?? "";

    const isLocalDeployment =
      siteUrl.includes("localhost") ||
      siteUrl.includes("127.0.0.1");

    /*
     * During local development, print the OTP to the Convex logs.
     * This is useful if Resend is not configured yet.
     */
    if (isLocalDeployment) {
      console.log(
        `[email-otp] verification code for ${email}: ${token}`,
      );
    }

    /*
     * Make sure Resend is configured.
     */
    if (!resend) {
      const message =
        "[email-otp] RESEND_API_KEY is not set in the deployment environment.";

      if (isLocalDeployment) {
        console.warn(message);
        return;
      }

      throw new Error(message);
    }

    const subject = "Your VerveFit sign-in code";

    const html = `
      <!DOCTYPE html>
      <html>
        <body
          style="
            margin: 0;
            padding: 40px 20px;
            background: #f5f5f5;
            font-family: Arial, sans-serif;
          "
        >
          <div
            style="
              max-width: 480px;
              margin: 0 auto;
              padding: 32px;
              background: #ffffff;
              border-radius: 12px;
            "
          >
            <h2 style="margin-top: 0;">
              Your VerveFit sign-in code
            </h2>

            <p>
              Use the verification code below to sign in to VerveFit:
            </p>

            <div
              style="
                margin: 28px 0;
                padding: 20px;
                text-align: center;
                background: #f5f5f5;
                border-radius: 8px;
              "
            >
              <span
                style="
                  font-size: 32px;
                  font-weight: 700;
                  letter-spacing: 8px;
                "
              >
                ${token}
              </span>
            </div>

            <p style="color: #666;">
              This code expires in 15 minutes.
            </p>

            <p style="color: #666;">
              If you did not request this code, you can safely ignore
              this email.
            </p>
          </div>
        </body>
      </html>
    `;

    try {
      const { data, error } = await resend.emails.send({
        from: RESEND_FROM_EMAIL,
        to: [email],
        subject,
        html,
      });

      if (error) {
        const detail =
          error.message?.slice(0, 500) ??
          "Unknown Resend error";

        console.error(
          `[email-otp] failed to deliver code to ${email}: ${detail}`,
        );

        if (!isLocalDeployment) {
          throw new Error(
            `Could not send the sign-in code (${detail}).`,
          );
        }

        return;
      }

      console.log(
        `[email-otp] sent sign-in code to ${email}: ${
          data?.id ?? "ok"
        }`,
      );
    } catch (error) {
      /*
       * Never log the API key or request headers.
       */
      const detail =
        error instanceof Error
          ? error.message
          : "Unknown error";

      console.error(
        `[email-otp] failed to deliver code to ${email}: ${detail}`,
      );

      if (!isLocalDeployment) {
        throw new Error(
          `Could not send the sign-in code (${detail}).`,
        );
      }
    }
  },
});
