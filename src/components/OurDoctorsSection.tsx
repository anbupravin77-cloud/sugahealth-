import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Award, 
  GraduationCap, 
  MapPin, 
  MessageSquare, 
  ArrowRight, 
  X, 
  CheckCircle2, 
  Clock, 
  HeartHandshake
} from 'lucide-react';
import { Image } from './ui/Image';
import { GsapHeaderReveal } from './ui/GsapReveal';
import { doctorsData } from '../data/doctors';
import { Doctor } from '../types';
import { useContent } from '../context/ContentContext';

interface OurDoctorsSectionProps {
  doctors?: Doctor[];
}

export function OurDoctorsSection({ doctors: propDoctors }: OurDoctorsSectionProps = {}) {
  const { content } = useContent();
  const doctors = propDoctors || content?.doctors || doctorsData;
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  // Prevent background scroll and chaining when modal is active
  useEffect(() => {
    if (selectedDoctor) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setSelectedDoctor(null);
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [selectedDoctor]);

  return (
    <section id="doctors" className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12 flex flex-col items-center">
        <GsapHeaderReveal className="flex flex-col items-center text-center">
          <span className="text-xs font-bold tracking-widest text-neutral-500 uppercase block mb-2.5 text-center">
            Medical Leadership & Care Team
          </span>
          <h2 className="font-sans text-3xl sm:text-4xl md:text-5xl font-extrabold text-neutral-950 tracking-tight leading-[1.15] pb-1 text-balance text-center">
            Board-certified doctors behind every prescription.
          </h2>
          <p className="mt-3.5 sm:mt-4 text-sm sm:text-base text-neutral-600 max-w-2xl mx-auto text-center leading-relaxed">
            No bots, no algorithmic shortcuts. Licensed US physicians personally evaluate every intake, design individualized treatment plans, and support you throughout your care.
          </p>
        </GsapHeaderReveal>
      </div>

      {/* Doctors Grid: Fully Responsive for Laptop (4 cols), Tablet (2 cols), Mobile (1 col) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-6 lg:gap-8">
        {doctorsData.map((doctor) => (
          <div
            key={doctor.id}
            className="group bg-white rounded-2xl sm:rounded-3xl border border-neutral-200/90 hover:border-neutral-950 transition-all duration-300 flex flex-col overflow-hidden shadow-xs hover:shadow-md"
          >
            {/* Portrait Image Header */}
            <div className="relative h-64 sm:h-72 w-full bg-neutral-100 overflow-hidden">
              <Image
                src={doctor.image}
                alt={`${doctor.name}, ${doctor.credentials}`}
                containerClassName="w-full h-full"
                className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent pointer-events-none" />

              {/* Verified Badge */}
              <div className="absolute top-3.5 left-3.5 pointer-events-none">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-md text-[10px] font-bold text-neutral-900 uppercase tracking-wider border border-neutral-200/60 shadow-xs">
                  <ShieldCheck size={12} className="text-emerald-600" />
                  Verified MD/DO
                </span>
              </div>

              {/* Doctor Details Over Image Bottom */}
              <div className="absolute bottom-3.5 left-3.5 right-3.5 text-white pointer-events-none">
                <h3 className="font-sans text-xl font-bold tracking-tight text-white leading-tight">
                  {doctor.name}
                </h3>
                <span className="text-xs font-semibold text-neutral-300 block">
                  {doctor.credentials} • {doctor.role}
                </span>
              </div>
            </div>

            {/* Card Content */}
            <div className="p-5 sm:p-6 flex flex-col flex-grow justify-between">
              <div>
                {/* Specialty Pill */}
                <div className="mb-3">
                  <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-neutral-700 bg-neutral-100 px-2.5 py-1 rounded-md">
                    {doctor.specialty}
                  </span>
                </div>

                {/* Education & Pedigree */}
                <div className="space-y-2 mb-4 text-xs text-neutral-600">
                  <div className="flex items-start gap-2">
                    <GraduationCap size={14} className="text-neutral-900 shrink-0 mt-0.5" />
                    <span className="font-medium line-clamp-1">{doctor.education}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin size={14} className="text-neutral-900 shrink-0 mt-0.5" />
                    <span>Licensed in {doctor.licensedStatesCount} States</span>
                  </div>
                </div>

                {/* Short Physician Quote - Hidden on mobile to keep cards compact */}
                <p className="text-xs italic text-neutral-500 line-clamp-2 sm:line-clamp-3 mb-4 leading-relaxed border-l-2 border-neutral-200 pl-3 hidden sm:block">
                  "{doctor.quote}"
                </p>
              </div>

              {/* Action Button */}
              <div className="pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setSelectedDoctor(doctor)}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-neutral-300 hover:border-neutral-950 bg-white hover:bg-neutral-50 text-xs font-bold text-neutral-800 uppercase tracking-wider transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] cursor-pointer"
                >
                  <Award size={13} />
                  <span>View Credentials</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Prominent Trust Anchor Card with Exact Requested Copy */}
      <div className="mt-10 sm:mt-12 lg:mt-14 rounded-2xl sm:rounded-3xl bg-neutral-950 text-white p-6 sm:p-8 lg:p-10 border border-neutral-800 shadow-lg relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-neutral-800/40 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-10">
          <div className="text-center lg:text-left max-w-2xl">
            {/* Pill Header */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-neutral-300 text-xs font-semibold mb-4 border border-white/10">
              <HeartHandshake size={14} className="text-emerald-400" />
              <span>Direct Doctor Access Included</span>
            </div>

            {/* Exact Requested Trust Anchor Text */}
            <h3 className="font-sans text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight sm:leading-tight">
              Care that feels personal.<br />
              <span className="text-neutral-300 font-medium">
                Guidance from real doctors, with someone you can reach whenever you need.
              </span>
            </h3>

            <p className="mt-3 text-xs sm:text-sm text-neutral-400 max-w-xl mx-auto lg:mx-0">
              Your care doesn’t stop with a prescription. Message your clinician directly, request dosage adjustments, and receive periodic medical check-ins at zero added charge.
            </p>
          </div>

          {/* Clinician Avatars & Fast Action Button */}
          <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0 w-full sm:w-auto">
            {/* Doctor Avatar Stack */}
            <div className="flex items-center -space-x-2.5">
              {doctorsData.map((d, i) => (
                <div 
                  key={i} 
                  className="w-10 h-10 rounded-full border-2 border-neutral-950 overflow-hidden bg-neutral-800 shrink-0"
                  title={d.name}
                >
                  <img 
                    src={d.image} 
                    alt={d.name} 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover" 
                  />
                </div>
              ))}
              <div className="w-10 h-10 rounded-full border-2 border-neutral-950 bg-neutral-800 text-neutral-300 text-xs font-bold flex items-center justify-center shrink-0">
                +40
              </div>
            </div>

            <Link
              to="/consultation"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-white hover:bg-neutral-200 text-neutral-950 text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-sm group"
            >
              <span>Meet Your Doctor</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* Doctor Bio & Credentials Modal */}
      <AnimatePresence>
        {selectedDoctor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-hidden overscroll-none">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDoctor(null)}
              className="fixed inset-0 bg-black/65 backdrop-blur-xs"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-xl bg-white rounded-2xl sm:rounded-3xl border border-neutral-200 shadow-2xl overflow-hidden z-10 my-auto flex flex-col max-h-[85vh] sm:max-h-[88vh]"
            >
              {/* Modal Header */}
              <div className="relative shrink-0 p-4 sm:p-6 md:p-7 bg-neutral-950 text-white flex items-center gap-3.5 sm:gap-5">
                <button
                  type="button"
                  onClick={() => setSelectedDoctor(null)}
                  className="absolute top-3.5 right-3.5 sm:top-5 sm:right-5 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer z-10"
                  aria-label="Close modal"
                >
                  <X size={16} />
                </button>

                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl overflow-hidden bg-neutral-800 border-2 border-white/20 shrink-0">
                  <img
                    src={selectedDoctor.image}
                    alt={selectedDoctor.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-top"
                  />
                </div>

                <div className="pr-6 sm:pr-8">
                  <span className="text-[10px] font-bold tracking-widest uppercase text-emerald-400 block mb-0.5">
                    Board-Certified Clinician
                  </span>
                  <h3 className="font-sans text-lg sm:text-2xl font-extrabold tracking-tight text-white leading-tight">
                    {selectedDoctor.name}, {selectedDoctor.credentials}
                  </h3>
                  <p className="text-xs text-neutral-300 mt-0.5">
                    {selectedDoctor.role}
                  </p>
                  <span className="inline-block mt-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400 bg-white/10 px-2 py-0.5 rounded">
                    {selectedDoctor.yearsOfExperience} Years Clinical Practice
                  </span>
                </div>
              </div>

              {/* Modal Body with overscroll containment */}
              <div className="p-4 sm:p-6 md:p-8 overflow-y-auto overscroll-contain space-y-4 sm:space-y-5 text-neutral-800 flex-grow">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
                    Clinical Background & Focus
                  </h4>
                  <p className="text-sm text-neutral-700 leading-relaxed">
                    {selectedDoctor.bio}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-2.5">
                  <div className="flex items-start gap-2.5 text-xs text-neutral-800">
                    <Award size={15} className="text-neutral-900 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Board Certification</span>
                      <span className="text-neutral-600">{selectedDoctor.boardCertification}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 text-xs text-neutral-800">
                    <GraduationCap size={15} className="text-neutral-900 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Medical Education</span>
                      <span className="text-neutral-600">{selectedDoctor.education}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 text-xs text-neutral-800">
                    <MapPin size={15} className="text-neutral-900 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Active Medical Licensing</span>
                      <span className="text-neutral-600">
                        Licensed in {selectedDoctor.licensedStatesCount} US states ({selectedDoctor.featuredStates.join(', ')} + more)
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
                    Clinical Philosophy
                  </h4>
                  <p className="text-xs italic text-neutral-600 border-l-2 border-neutral-950 pl-3 leading-relaxed">
                    "{selectedDoctor.quote}"
                  </p>
                </div>
              </div>

              {/* Modal Footer - Pinned */}
              <div className="shrink-0 p-4 sm:p-5 md:p-6 bg-neutral-50 border-t border-neutral-200/80 flex items-center justify-between gap-2.5 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedDoctor(null)}
                  className="px-4 sm:px-5 py-2.5 rounded-full border border-neutral-300 text-xs font-bold uppercase tracking-wider text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  Close
                </button>
                <Link
                  to="/consultation"
                  onClick={() => setSelectedDoctor(null)}
                  className="inline-flex items-center gap-1.5 px-4 sm:px-6 py-2.5 rounded-full bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-xs text-center"
                >
                  <span>Request Consultation</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
