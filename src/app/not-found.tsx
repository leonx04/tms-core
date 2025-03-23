"use client";
import anime from 'animejs';
import Link from 'next/link';
import { useEffect } from 'react';

export default function NotFound() {
  useEffect(() => {
    anime({
      targets: '.row svg',
      translateY: 10,
      autoplay: true,
      loop: true,
      easing: 'easeInOutSine',
      direction: 'alternate'
    })

    anime({
      targets: '#zero',
      translateX: 10,
      autoplay: true,
      loop: true,
      easing: 'easeInOutSine',
      direction: 'alternate',
      scale: [{ value: 1 }, { value: 1.4 }, { value: 1, delay: 250 }],
      rotateY: { value: '+=180', delay: 200 }
    })
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="text-center max-w-md px-6">
        <div className="row flex justify-center mb-6 space-x-4">
          <svg
            id="zero"
            width="100"
            height="100"
            viewBox="0 0 100 100"
            fill="none"
            className="text-primary"
          >
            <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="5" />
            <line x1="30" y1="40" x2="40" y2="40" stroke="currentColor" strokeWidth="5" />
            <line x1="60" y1="40" x2="70" y2="40" stroke="currentColor" strokeWidth="5" />
            <path d="M40 60 Q50 70 60 60" stroke="currentColor" strokeWidth="5" fill="none" />
          </svg>
          <svg
            id="handboy"
            width="100"
            height="100"
            viewBox="0 0 100 100"
            fill="none"
            className="text-secondary"
          >
            <rect x="30" y="30" width="40" height="40" stroke="currentColor" strokeWidth="5" />
          </svg>
          <svg
            id="girllight"
            width="100"
            height="100"
            viewBox="0 0 100 100"
            fill="none"
            className="text-tertiary"
          >
            <polygon points="50,15 80,85 20,85" stroke="currentColor" strokeWidth="5" fill="none" />
          </svg>
          <svg
            id="hairgirl"
            width="100"
            height="100"
            viewBox="0 0 100 100"
            fill="none"
            className="text-quaternary"
          >
            <path d="M50 10 L90 90 L10 90 Z" stroke="currentColor" strokeWidth="5" fill="none" />
          </svg>
        </div>

        <h1 className="text-6xl font-bold mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-6">Page Not Found</h2>
        <p className="text-muted-foreground mb-8">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <Link href="/" className="inline-flex items-center justify-center px-6 py-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
          Return Home
        </Link>
      </div>

      <style jsx>{`
        body {
          background-color: #fff;
        }
        #handboy {
          animation: swing 1.3s ease-in-out infinite alternate;
          transform-origin: 98% 98%;
          transform-box: fill-box;
        }
        #girllight {
          animation: swing 1.3s ease-in-out infinite alternate;
          transform-origin: 0% 97%;
          transform-box: fill-box;
        }
        #hairgirl {
          animation: swinghair 1.3s ease-in-out infinite alternate;
          transform-origin: 60% 0%;
          transform-box: fill-box;
        }
        #zero {
          transform-origin: bottom;
          transform-box: fill-box;
        }
        @keyframes swing {
          0% {
            transform: rotate(10deg);
          }
          100% {
            transform: rotate(-10deg);
          }
        }
        @keyframes swinghair {
          0% {
            transform: rotate(6deg);
          }
          100% {
            transform: rotate(-6deg);
          }
        }
      `}</style>
    </div>
  )
}
