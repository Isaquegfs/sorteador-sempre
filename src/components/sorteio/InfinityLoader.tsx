export const InfinityLoader = () => {
  return (
    <div className="text-center space-y-6 py-8">
      {/* Animação de infinito */}
      <div className="flex justify-center">
        <svg 
          width="200" 
          height="100" 
          viewBox="0 0 200 100" 
          className="infinity-loader"
        >
          {/* Path do símbolo de infinito */}
          <path
            d="M 30,50 C 30,30 40,20 55,20 C 70,20 80,30 100,50 C 120,70 130,80 145,80 C 160,80 170,70 170,50 C 170,30 160,20 145,20 C 130,20 120,30 100,50 C 80,70 70,80 55,80 C 40,80 30,70 30,50 Z"
            fill="none"
            stroke="hsl(221 100% 32%)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="400"
            strokeDashoffset="400"
            className="infinity-path-blue"
          />
          <path
            d="M 30,50 C 30,30 40,20 55,20 C 70,20 80,30 100,50 C 120,70 130,80 145,80 C 160,80 170,70 170,50 C 170,30 160,20 145,20 C 130,20 120,30 100,50 C 80,70 70,80 55,80 C 40,80 30,70 30,50 Z"
            fill="none"
            stroke="hsl(17 86% 58%)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="400"
            strokeDashoffset="400"
            className="infinity-path-orange"
          />
        </svg>
      </div>
      
      {/* Texto */}
      <p className="text-2xl font-semibold text-white">
        Carregando sorteio...
      </p>

      <style>{`
        .infinity-path-blue {
          animation: infinityRun 3s ease-in-out infinite;
        }
        
        .infinity-path-orange {
          animation: infinityRun 3s ease-in-out infinite;
          animation-delay: 1.5s;
        }
        
        @keyframes infinityRun {
          0% {
            stroke-dashoffset: 400;
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          50% {
            stroke-dashoffset: 0;
            opacity: 1;
          }
          90% {
            opacity: 0;
          }
          100% {
            stroke-dashoffset: -400;
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};
