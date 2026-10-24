import { Suspense } from "react";
import { SignInRoute } from "@/components/auth/sign-in-route";
import { titleFrom } from "@/lib/metadata";

export const generateMetadata = titleFrom((t) => t("auth.signUp.title"));

const SignUpPage = () => (
  <Suspense>
    <SignInRoute mode="sign-up" />
  </Suspense>
);

export default SignUpPage;
