declare module "react-hot-toast/original" {
  export * from "react-hot-toast";
  const RHT: typeof import("react-hot-toast").toast;
  export default RHT;
}
