import { getStaff } from '../actions';
import { StaffProjection, StaffTable } from './components/StaffTable';

export default async function StaffPage() {
  const staff = await getStaff();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Staff Plan</h2>
      <StaffProjection data={staff} />
      <StaffTable data={staff} />
    </div>
  );
}
