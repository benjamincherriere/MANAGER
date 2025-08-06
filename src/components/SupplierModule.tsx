import React, { useState, useEffect } from 'react';
import { Plus, Calendar, AlertTriangle, Edit2, Trash2, Eye } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
);

interface Supplier {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  created_at: string;
}

interface Meeting {
  id: string;
  supplier_id: string;
  meeting_date: string;
  notes?: string;
  created_at: string;
  supplier?: Supplier;
}

const SupplierModule: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [showAddMeeting, setShowAddMeeting] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: ''
  });

  const [meetingForm, setMeetingForm] = useState({
    supplier_id: '',
    meeting_date: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load suppliers
      const { data: suppliersData, error: suppliersError } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');

      if (suppliersError) throw suppliersError;
      setSuppliers(suppliersData || []);

      // Load meetings with supplier info
      const { data: meetingsData, error: meetingsError } = await supabase
        .from('meetings')
        .select(`
          *,
          supplier:suppliers(*)
        `)
        .order('meeting_date', { ascending: false });

      if (meetingsError) throw meetingsError;
      setMeetings(meetingsData || []);
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const addSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    // Validation
    if (!supplierForm.name.trim()) {
      setError('Le nom du fournisseur est obligatoire');
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .insert([{
          name: supplierForm.name.trim(),
          contact_person: supplierForm.contact_person.trim() || null,
          email: supplierForm.email.trim() || null,
          phone: supplierForm.phone.trim() || null
        }])
        .select();

      if (error) {
        console.error('Erreur Supabase:', error);
        throw new Error(`Erreur lors de l'ajout: ${error.message}`);
      }

      setSuccess('Fournisseur ajouté avec succès !');
      setSupplierForm({ name: '', contact_person: '', email: '', phone: '' });
      
      // Fermer le modal après 1.5 secondes
      setTimeout(() => {
        setShowAddSupplier(false);
        setSuccess(null);
      }, 1500);
      
      await loadData();
    } catch (error) {
      console.error('Erreur lors de l\'ajout:', error);
      setError(error instanceof Error ? error.message : 'Une erreur est survenue');
    }
  };

  const addMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    // Validation
    if (!meetingForm.supplier_id || !meetingForm.meeting_date) {
      setError('Le fournisseur et la date sont obligatoires');
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('meetings')
        .insert([{
          supplier_id: meetingForm.supplier_id,
          meeting_date: meetingForm.meeting_date,
          notes: meetingForm.notes.trim() || null
        }])
        .select();

      if (error) {
        console.error('Erreur Supabase:', error);
        throw new Error(`Erreur lors de l'ajout: ${error.message}`);
      }

      setSuccess('Rendez-vous enregistré avec succès !');
      setMeetingForm({ supplier_id: '', meeting_date: '', notes: '' });
      
      // Fermer le modal après 1.5 secondes
      setTimeout(() => {
        setShowAddMeeting(false);
        setSuccess(null);
      }, 1500);
      
      await loadData();
    } catch (error) {
      console.error('Erreur lors de l\'ajout:', error);
      setError(error instanceof Error ? error.message : 'Une erreur est survenue');
    }
  };

  const getLastMeetingDate = (supplierId: string): Date | null => {
    const supplierMeetings = meetings.filter(m => m.supplier_id === supplierId);
    if (supplierMeetings.length === 0) return null;
    
    const lastMeeting = supplierMeetings.reduce((latest, current) => 
      new Date(current.meeting_date) > new Date(latest.meeting_date) ? current : latest
    );
    
    return new Date(lastMeeting.meeting_date);
  };

  const isOverdue = (supplierId: string): boolean => {
    const lastMeeting = getLastMeetingDate(supplierId);
    if (!lastMeeting) return true;
    
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    
    return lastMeeting < twoYearsAgo;
  };

  const getDaysOverdue = (supplierId: string): number => {
    const lastMeeting = getLastMeetingDate(supplierId);
    if (!lastMeeting) return Infinity;
    
    const twoYearsFromLast = new Date(lastMeeting);
    twoYearsFromLast.setFullYear(twoYearsFromLast.getFullYear() + 2);
    
    const today = new Date();
    const diffTime = today.getTime() - twoYearsFromLast.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const overdueSuppliers = suppliers.filter(s => isOverdue(s.id));

  return (
    <div className="space-y-6">
      {/* Messages d'erreur et succès globaux */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <Eye className="h-5 w-5 text-green-600 mr-2" />
            <p className="text-green-800">{success}</p>
          </div>
        </div>
      )}

      {/* Header with stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Fournisseurs</p>
              <p className="text-2xl font-bold text-gray-900">{suppliers.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Eye className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">RDV cette année</p>
              <p className="text-2xl font-bold text-gray-900">
                {meetings.filter(m => new Date(m.meeting_date).getFullYear() === new Date().getFullYear()).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">En retard</p>
              <p className="text-2xl font-bold text-gray-900">{overdueSuppliers.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts for overdue suppliers */}
      {overdueSuppliers.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
            <h3 className="text-lg font-medium text-red-800">Fournisseurs en retard</h3>
          </div>
          <div className="space-y-2">
            {overdueSuppliers.map(supplier => (
              <div key={supplier.id} className="flex items-center justify-between bg-white rounded p-3">
                <div>
                  <p className="font-medium text-gray-900">{supplier.name}</p>
                  <p className="text-sm text-gray-600">
                    {getLastMeetingDate(supplier.id) 
                      ? `Dernier RDV: ${getLastMeetingDate(supplier.id)?.toLocaleDateString('fr-FR')}`
                      : 'Aucun RDV enregistré'
                    }
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-red-600">
                    {getDaysOverdue(supplier.id) === Infinity 
                      ? 'Jamais vu' 
                      : `${getDaysOverdue(supplier.id)} jours de retard`
                    }
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-4">
        <button
          onClick={() => setShowAddSupplier(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un fournisseur
        </button>
        <button
          onClick={() => setShowAddMeeting(true)}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Enregistrer un RDV
        </button>
      </div>

      {/* Suppliers list */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Liste des fournisseurs</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {suppliers.map(supplier => {
            const lastMeeting = getLastMeetingDate(supplier.id);
            const overdue = isOverdue(supplier.id);
            
            return (
              <div key={supplier.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h4 className="text-lg font-medium text-gray-900">{supplier.name}</h4>
                      {overdue && (
                        <span className="ml-2 px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                          En retard
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      {supplier.contact_person && <p>Contact: {supplier.contact_person}</p>}
                      {supplier.email && <p>Email: {supplier.email}</p>}
                      {supplier.phone && <p>Téléphone: {supplier.phone}</p>}
                    </div>
                    <div className="mt-2 text-sm">
                      {lastMeeting ? (
                        <p className="text-gray-600">
                          Dernier RDV: <span className="font-medium">{lastMeeting.toLocaleDateString('fr-FR')}</span>
                        </p>
                      ) : (
                        <p className="text-red-600 font-medium">Aucun RDV enregistré</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent meetings */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Derniers rendez-vous</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {meetings.slice(0, 10).map(meeting => (
            <div key={meeting.id} className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">{meeting.supplier?.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {new Date(meeting.meeting_date).toLocaleDateString('fr-FR')}
                  </p>
                  {meeting.notes && (
                    <p className="text-sm text-gray-700 mt-2">{meeting.notes}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Supplier Modal */}
      {showAddSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Ajouter un fournisseur</h3>
            <form onSubmit={addSupplier} className="space-y-4">
              {/* Messages dans le modal */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
              
              {success && (
                <div className="bg-green-50 border border-green-200 rounded p-3">
                  <p className="text-sm text-green-800">{success}</p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du fournisseur *
                </label>
                <input
                  type="text"
                  required
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({...supplierForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Personne de contact
                </label>
                <input
                  type="text"
                  value={supplierForm.contact_person}
                  onChange={(e) => setSupplierForm({...supplierForm, contact_person: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={supplierForm.email}
                  onChange={(e) => setSupplierForm({...supplierForm, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={supplierForm.phone}
                  onChange={(e) => setSupplierForm({...supplierForm, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddSupplier(false);
                    setError(null);
                    setSuccess(null);
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Ajouter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Meeting Modal */}
      {showAddMeeting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Enregistrer un rendez-vous</h3>
            <form onSubmit={addMeeting} className="space-y-4">
              {/* Messages dans le modal */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
              
              {success && (
                <div className="bg-green-50 border border-green-200 rounded p-3">
                  <p className="text-sm text-green-800">{success}</p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fournisseur *
                </label>
                <select
                  required
                  value={meetingForm.supplier_id}
                  onChange={(e) => setMeetingForm({...meetingForm, supplier_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sélectionner un fournisseur</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date du rendez-vous *
                </label>
                <input
                  type="date"
                  required
                  value={meetingForm.meeting_date}
                  onChange={(e) => setMeetingForm({...meetingForm, meeting_date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={meetingForm.notes}
                  onChange={(e) => setMeetingForm({...meetingForm, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Notes sur le rendez-vous..."
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddMeeting(false);
                    setError(null);
                    setSuccess(null);
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierModule;