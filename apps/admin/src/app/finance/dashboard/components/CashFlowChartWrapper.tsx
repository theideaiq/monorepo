import { getCashFlowData } from '../actions';
import { CashFlowChart } from './CashFlowChart';

export async function CashFlowChartWrapper({
  startDate,
  endDate: _endDate,
}: {
  startDate: string;
  endDate: string;
}) {
  // Assuming startDate is start of year for now to extract year
  const year = new Date(startDate).getFullYear();
  const data = await getCashFlowData(year);

  return <CashFlowChart data={data} />;
}
