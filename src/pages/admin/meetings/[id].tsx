import { useParams } from "react-router-dom";
import { useState } from "react";
import { getMeetingById, Meeting } from "../../../data/meetings";

const MeetingDetail = () => {
  const { id } = useParams<{ id: string }>();
  const meeting = getMeetingById(Number(id));
  const [formData, setFormData] = useState<Meeting | undefined>(meeting);

  if (!meeting || !formData) {
    return <p>Rendez-vous introuvable.</p>;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => (prev ? { ...prev, [name]: value } : prev));
  };

  const handleSave = () => {
    alert("Rendez-vous modifié (simulation)");
  };

  const sendInvitation = () => {
    alert("Invitation envoyée");
  };

  return (
    <div>
      <h2>Détails du rendez-vous</h2>
      <div className="flex flex-col gap-2">
        <label>
          Date :
          <input
            name="date"
            value={formData.date}
            onChange={handleChange}
            className="border ml-2"
          />
        </label>
        <label>
          Fournisseur :
          <input
            name="provider"
            value={formData.provider}
            onChange={handleChange}
            className="border ml-2"
          />
        </label>
        <label>
          Statut :
          <input
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="border ml-2"
          />
        </label>
        <label>
          Détails :
          <input
            name="details"
            value={formData.details}
            onChange={handleChange}
            className="border ml-2"
          />
        </label>
      </div>
      <div className="mt-4 flex gap-2">
        <button onClick={handleSave} className="border px-2 py-1">
          Enregistrer
        </button>
        <button onClick={sendInvitation} className="border px-2 py-1">
          Envoyer l'invitation
        </button>
      </div>
    </div>
  );
};

export default MeetingDetail;

