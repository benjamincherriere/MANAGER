import React from 'react';

export interface QualityCheck {
  /** Unique id for the quality criterion. */
  id: string;
  /** Human readable description of the check. */
  label: string;
  /** Whether the check passed or not. */
  valid: boolean;
}

export interface QualityCriteriaListProps {
  /** Results of the quality verification to display. */
  criteria: QualityCheck[];
}

/**
 * Display a list of quality criteria with their validation status.
 * Failed criteria are highlighted to draw attention to missing or invalid data.
 */
export const QualityCriteriaList: React.FC<QualityCriteriaListProps> = ({ criteria }) => {
  if (criteria.length === 0) {
    return <p>Aucun critère de qualité à afficher.</p>;
  }

  return (
    <ul className="list-disc pl-5">
      {criteria.map((c) => (
        <li key={c.id} className={c.valid ? 'text-green-600' : 'text-red-600'}>
          {c.label}
        </li>
      ))}
    </ul>
  );
};

export default QualityCriteriaList;
