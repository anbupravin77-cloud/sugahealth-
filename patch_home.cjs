const fs = require('fs');

const content = fs.readFileSync('src/pages/Home.tsx', 'utf8');

const startIndex = content.indexOf('{/* Hero Section */}');
const endIndex = content.indexOf('{/* Treatments Section - Modern Bento Cards */}');

if (startIndex === -1 || endIndex === -1) {
  console.error('Could not find Hero Section boundaries.');
  process.exit(1);
}

const newHeroSection = `{/* Hero Section */}
      <section className="relative pt-0 pb-10 sm:pb-14 md:pb-16 overflow-hidden bg-[#FAFAFA] border-b border-neutral-200/80">
        {/* Marquee Ticker */}
        <div className="w-full bg-[#F5F5F5] py-3.5 overflow-hidden border-b border-neutral-200/80">
          <div className="flex animate-marquee items-center text-[11px] font-bold text-neutral-600 uppercase tracking-widest whitespace-nowrap">
            {Array.from({ length: 4 }).map((_, i) => (
              <span key={i} className="flex items-center shrink-0">
                <span className="px-6">Fully confidential</span> <span className="text-neutral-300">✦</span>
                <span className="px-6">Free and discrete shipping</span> <span className="text-neutral-300">✦</span>
                <span className="px-6">100% online process</span> <span className="text-neutral-300">✦</span>
                <span className="px-6">Used and trusted by millions around the world.</span> <span className="text-neutral-300">✦</span>
              </span>
            ))}
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 md:pt-32 pb-8">
          <div className="flex flex-col items-center text-center">
            
            <Reveal delay={0.1} className="w-full flex flex-col items-center justify-center text-center">
              <h1 className="font-sans text-4xl sm:text-5xl md:text-[3.5rem] lg:text-[4rem] font-normal tracking-tight text-neutral-900 leading-[1.2] text-balance text-center mx-auto w-full">
                Clinically proven, FDA (USA)<br className="hidden sm:block" />
                approved, treatment<br className="hidden sm:block" />
                prescribed by experts.
              </h1>
            </Reveal>

            <Reveal delay={0.2} className="w-full flex justify-center text-center mt-12 sm:mt-16">
              <div className="flex flex-col items-center gap-3.5 w-full max-w-[280px] sm:max-w-[320px] mx-auto">
                <Link
                  to="/weight-loss"
                  className="w-full inline-flex items-center justify-center bg-transparent border border-neutral-300 hover:border-neutral-400 px-6 py-4 rounded-[2rem] text-[15px] text-neutral-800 transition-colors text-center"
                >
                  Medical weight loss
                </Link>
                <Link
                  to="/hair-growth"
                  className="w-full inline-flex items-center justify-center bg-transparent border border-neutral-300 hover:border-neutral-400 px-6 py-4 rounded-[2rem] text-[15px] text-neutral-800 transition-colors text-center"
                >
                  Hair growth
                </Link>
                <Link
                  to="/sexual-health"
                  className="w-full inline-flex items-center justify-center bg-transparent border border-neutral-300 hover:border-neutral-400 px-6 py-4 rounded-[2rem] text-[15px] text-neutral-800 transition-colors text-center"
                >
                  Sexual health
                </Link>
                <Link
                  to="/consultation"
                  className="w-full inline-flex items-center justify-center bg-neutral-950 hover:bg-neutral-800 text-white px-6 py-4 rounded-[2rem] text-[15px] font-medium transition-colors text-center mt-3 shadow-sm"
                >
                  Start consultation
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      `;

const newContent = content.slice(0, startIndex) + newHeroSection + content.slice(endIndex);

fs.writeFileSync('src/pages/Home.tsx', newContent, 'utf8');
console.log('Successfully patched Home.tsx');
