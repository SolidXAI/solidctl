import React from 'react';
import 'primeicons/primeicons.css';

interface StatusIconProps {
  isPublished: boolean;
}

export const StatusIcon: React.FC<StatusIconProps> = ({ isPublished }) => {
  return (
    <span
      className={`status-icon ${isPublished ? 'success' : 'danger'}`}
      title={isPublished ? 'Published' : 'Not Published'}
    >
      <i className={`pi ${isPublished ? 'pi-check' : 'pi-times'}`} />
    </span>
  );
};
