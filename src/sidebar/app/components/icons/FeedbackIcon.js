import React from 'react';

function FeedbackIcon(props) {
  return (
    <svg
      id="Layer_1"
      width="20"
      height="20"
      data-name="Layer 1"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
    >
      <defs>
        <style>
          .cls-1{'{'}fill:none;stroke:#333;stroke-miterlimit:10{'}'}{' '}
          .cls-2{'{'}fill:#333{'}'}
        </style>
      </defs>
      <path
        className="cls-1"
        d="M14.32 10.58A5.27 5.27 0 0 0 15 8c0-3.31-3.13-6-7-6S1 4.69 1 8s3.13 6 7 6a7.72 7.72 0 0 0 4.37-1.32L15 14z"
      />
      <circle className="cls-2" cx="8" cy="8" r="1" />
      <circle className="cls-2" cx="4" cy="8" r="1" />
      <circle className="cls-2" cx="12" cy="8" r="1" />
    </svg>
  );
}

export default FeedbackIcon;
