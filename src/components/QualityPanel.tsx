import React from 'react';
import QualityCriteriaList, { QualityCheck } from './QualityCriteriaList';

export interface QualityPanelProps {
  /** Verification results injected from the parent. */
  criteria: QualityCheck[];
}

/**
 * Admin panel tab that summarises the quality of the current entity by listing
 * failed or pending quality criteria.
 */
const QualityPanel: React.FC<QualityPanelProps> = ({ criteria }) => {
  return (
    <section>
      <h2 className="text-lg font-bold mb-2">Qualité</h2>
      <QualityCriteriaList criteria={criteria} />
    </section>
  );
};

export default QualityPanel;
