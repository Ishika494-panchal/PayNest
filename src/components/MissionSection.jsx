import { CheckCircle2, MessagesSquare } from 'lucide-react'
import missionImage from '../assets/Business mission-amico.png'

function MissionSection() {
  return (
    <section className="border-t border-[#e6e1d9] bg-[#f5f2eb] py-14">
      <div className="mx-auto grid w-full max-w-[1240px] gap-8 px-4 sm:px-6 md:grid-cols-2 md:items-center lg:px-8">
        <div className="h-[270px] overflow-hidden rounded-2xl bg-gradient-to-br from-[#9ec0b5] via-[#6f9587] to-[#3f594f] p-3 shadow-[0_10px_18px_rgba(0,0,0,0.15)]">
          <img
            src={missionImage}
            alt="Business mission illustration"
            className="h-full w-full rounded-xl object-contain object-center"
          />
        </div>
        <div>
          <h2 className="text-[42px] font-semibold leading-[1.02] tracking-[-0.03em] text-[#1f1f1f] md:text-[46px]">
            Our Mission
          </h2>
          <p className="mt-4 max-w-[430px] text-[13px] leading-[1.75] text-[#676767]">
            We empower gig workers with reliable financial protection built for
            modern daily uncertainty.
          </p>
          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-2 text-[13px] text-[#3b3b3b]">
              <CheckCircle2 className="h-4 w-4 text-[#5d6f8d]" />
              Rider-first support
            </div>
            <div className="flex items-center gap-2 text-[13px] text-[#3b3b3b]">
              <MessagesSquare className="h-4 w-4 text-[#5d6f8d]" />
              Built with community feedback
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default MissionSection
