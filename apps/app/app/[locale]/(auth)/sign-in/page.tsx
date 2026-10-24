import { Suspense } from "react";
import { SignInRoute } from "@/components/auth/sign-in-route";
import { titleFrom } from "@/lib/metadata";

export const generateMetadata = titleFrom((t) => t("auth.signIn.title"));

const SignInPage = () => (
  <Suspense>
    <SignInRoute mode="sign-in" />
  </Suspense>
);

export default SignInPage;
