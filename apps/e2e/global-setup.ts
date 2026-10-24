import {
  ensureProduct,
  resetCustomer,
  resetPhoneUser,
  resetStaff,
} from "./seed";

/** Seeds everything the journeys need (see seed.ts). */
export default async function globalSetup() {
  await ensureProduct();
  await resetCustomer();
  await resetStaff();
  await resetPhoneUser();
}
