import { default as axios } from "axios";

export default async (): Promise<string> => {
  const result = await axios.get("https://api.coingecko.com/api/v3/coins/index-cooperative");
  const circulatingSupply = result.data.market_data.circulating_supply;
  return (0.05 * circulatingSupply).toFixed(0);
}