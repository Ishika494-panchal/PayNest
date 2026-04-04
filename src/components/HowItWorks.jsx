const steps = [
  { id: '01', title: 'Signup', text: 'Create your rider profile.' },
  { id: '02', title: 'Choose Plan', text: 'Pick weekly protection.' },
  { id: '03', title: 'AI Analysis', text: 'Risk & income pattern scan.' },
  { id: '04', title: 'Get Payout', text: 'Instant transfer when needed.' },
]

function HowItWorks() {
  return (
    <section className="border-y border-[#e6e1d9] bg-[#f5f2eb] py-12">
      <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-6 lg:px-8">
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#7f7b73]">
          How It Works
        </h2>
        <p className="mt-3 text-[13px] text-[#7d7a73]">
          Four simple steps to secure your earnings.
        </p>
        <div className="mt-7 grid gap-4 md:grid-cols-4">
          {steps.map((step) => (
            <article
              key={step.id}
              className="rounded-2xl border border-[#ece8e0] bg-white p-5"
            >
              <p className="text-[19px] font-semibold tracking-[-0.03em] text-[#dfddd9]">
                {step.id}
              </p>
              <h3 className="mt-6 text-[14px] font-semibold text-[#1f1f1f]">
                {step.title}
              </h3>
              <p className="mt-2 text-[12px] leading-[1.5] text-[#8a8a8a]">{step.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default HowItWorks
