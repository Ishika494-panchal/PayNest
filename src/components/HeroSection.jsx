import heroImage from '../assets/Take Away-pana.svg'

function HeroSection() {
  return (
    <section className="mx-auto grid w-full max-w-[1240px] gap-8 px-4 pb-14 pt-2 sm:px-6 md:grid-cols-2 md:items-center lg:px-8">
      <div>
        <h1 className="max-w-[470px] text-[42px] font-semibold leading-[0.98] tracking-[-0.035em] text-[#1f1f1f] md:text-[58px]">
          AI-Powered
          <br />
          Income
          <br />
          Protection for
          <br />
          Gig Workers
        </h1>
        <p className="mt-5 max-w-[410px] text-[13px] leading-[1.55] text-[#686868]">
          Smart and flexible financial support tailored for riders, drivers, and
          freelancers.
        </p>
        <div className="mt-7 flex items-center gap-3">
          <button className="rounded-full bg-[#426793] px-6 py-2.5 text-[12px] font-semibold tracking-[0.05em] text-white">
            GET STARTED
          </button>
          <button className="rounded-full bg-[#d9b949] px-6 py-2.5 text-[12px] font-semibold tracking-[0.05em] text-[#2d2612]">
            WATCH VIDEO
          </button>
        </div>
      </div>
      <div className="relative md:justify-self-end">
        <div className="rounded-[24px] bg-[#86c7c1] p-5 shadow-[0_14px_26px_rgba(30,30,30,0.18)] md:w-[450px]">
          <img
            src={heroImage}
            alt="Delivery rider"
            className="h-[290px] w-full rounded-[18px] object-cover"
          />
        </div>
        <div className="absolute -bottom-6 left-5 rounded-xl bg-white px-4 py-3 shadow-[0_8px_18px_rgba(0,0,0,0.12)]">
          <div className="h-1 w-24 rounded-full bg-[#ffe58a]" />
        </div>
      </div>
    </section>
  )
}

export default HeroSection
