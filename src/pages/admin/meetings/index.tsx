import { Link } from "react-router-dom";
import { meetings } from "../../../data/meetings";

const MeetingsList = () => {
  return (
    <div>
      <h2>Tableau des rendez-vous</h2>
      <table className="min-w-full border-collapse border">
        <thead>
          <tr>
            <th className="border px-2 py-1 text-left">Date</th>
            <th className="border px-2 py-1 text-left">Fournisseur</th>
            <th className="border px-2 py-1 text-left">Statut</th>
          </tr>
        </thead>
        <tbody>
          {meetings.map((meeting) => (
            <tr key={meeting.id}>
              <td className="border px-2 py-1">
                <Link to={`/admin/meetings/${meeting.id}`}>{meeting.date}</Link>
              </td>
              <td className="border px-2 py-1">{meeting.provider}</td>
              <td className="border px-2 py-1">{meeting.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MeetingsList;

