declare module "react-native-razorpay" {
  interface RazorpayPrefill {
    name?: string;
    contact?: string;
    email?: string;
  }

  interface RazorpayOptions {
    key: string;
    amount: number;
    name: string;
    description?: string;
    currency?: string;
    prefill?: RazorpayPrefill;
  }

  interface RazorpayCheckoutStatic {
    open(options: RazorpayOptions): Promise<unknown>;
  }

  const RazorpayCheckout: RazorpayCheckoutStatic;
  export default RazorpayCheckout;
}
