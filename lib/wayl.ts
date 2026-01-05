export const wayl = {
  createPayment: async (amount: number, currency: string, description: string) => {
    // This is a stub implementation.
    // Replace with actual Wayl API integration logic.
    console.log('Creating payment:', { amount, currency, description });
    return `https://checkout.wayl.com/pay/${Math.random().toString(36).substring(7)}`;
  }
};
