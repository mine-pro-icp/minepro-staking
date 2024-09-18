import React from "react";

const Footer: React.FC = () => {
  const year = new Date().getFullYear();
  
  return (
    <footer className="w-full">
      {/* top section */}
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 justify-between px-4 sm:px-12 lg:px-20 pt-[112px] pb-14">
        {/* left col - logo and about */}
        <div className="">
          {/* logo */}
          <div className="flex items-center gap-3">
            <img src="/logo-white.svg" alt="logo" width={36.24} height={38} />
            <p className="font-bold text-[26px] leading-8 text-white">MinePro</p>
          </div>
          {/* about */}
          <p className="text-[14px] leading-6 mt-4 max-w-[358px] text-white/60 text-left">
            No information stated on this web page or elsewhere by MinePro is to
            be misconstrued as financial advice. It is recommended to consult
            with a professional investment advisor before investing in any
            opportunity.
          </p>
        </div>
        {/* quick links */}
        <div className="flex flex-col gap-4">
          <p className="text-[20px] font-bold leading-8 text-left text-white">
            Quick Links
          </p>
          <a
            href="https://discord.gg/dWtWJjwNYy"
            target="_blank"
            rel="noreferrer"
            className="text-[14px] font-semibold leading-6 text-white/60 hover:text-white transition-all duration-200"
          >
            Discord
          </a>
          <a
            href="https://twitter.com/MineProBusiness"
            target="_blank"
            rel="noreferrer"
            className="text-[14px] font-semibold leading-6 text-white/60 hover:text-white transition-all duration-200"
          >
            X/Twitter
          </a>
          <a
            href="https://minepro.gitbook.io/minepro-legal-documentation/"
            target="_blank"
            rel="noreferrer"
            className="text-[14px] font-semibold leading-6 text-white/60 hover:text-white transition-all duration-200"
          >
            Legal
          </a>
          <a
            href="https://minepro-1.gitbook.io/minepro-documentation"
            target="_blank"
            rel="noreferrer"
            className="text-[14px] font-semibold leading-6 text-white/60 hover:text-white transition-all duration-200"
          >
            Docs
          </a>
          {/* <a
            href="https://presale.mineprobusiness.net/"
            target="_blank"
            rel="noreferrer"
            className="text-[14px] font-semibold leading-6 text-white/60 hover:text-white transition-all duration-200"
          >
            Join Live Presale
          </a> */}
        </div>
        {/* company links */}
        <div className="flex flex-col gap-4">
          <p className="text-[20px] font-bold leading-8 text-left text-white">Company</p>
          <a
            href="https://minepro-1.gitbook.io/minepro-documentation"
            target="_blank"
            rel="noreferrer"
            className="text-[14px] font-semibold leading-6 text-white/60 hover:text-white transition-all duration-200"
          >
            About us
          </a>
          <a
            href="https://minepro.gitbook.io/minepro-legal-documentation/disclaimer"
            target="_blank"
            rel="noreferrer"
            className="text-[14px] font-semibold leading-6 text-white/60 hover:text-white transition-all duration-200"
          >
            Disclaimer
          </a>
          <a
            href="https://minepro.gitbook.io/minepro-legal-documentation/privacy-policy"
            target="_blank"
            rel="noreferrer"
            className="text-[14px] font-semibold leading-6 text-white/60 hover:text-white transition-all duration-200"
          >
            Privacy Policy
          </a>
          <a
            href="https://minepro.gitbook.io/minepro-legal-documentation/terms-and-conditions"
            target="_blank"
            rel="noreferrer"
            className="text-[14px] font-semibold leading-6 text-white/60 hover:text-white transition-all duration-200"
          >
            Terms & Conditions
          </a>
        </div>
        {/* socials */}
        <div className="flex flex-col gap-4">
          <p className="text-[20px] font-bold leading-8 text-left text-white">Join us</p>
          <div className="flex items-center gap-4">
            {/* discord */}
            <div className="glassButtonContainer">
              <a
                href="https://discord.gg/dWtWJjwNYy"
                target="_blank"
                rel="noreferrer"
                className="glassButton" /* text-[14px] font-semibold leading-6  */
              >
                <img
                  src="/icons/socials/discord.svg"
                  alt="discord icon"
                  width={32}
                  height={32}
                  className="mt-2"
                />
              </a>
            </div>

            {/* gitbook */}
            <div className="glassButtonContainer">
              <a
                href="https://minepro-1.gitbook.io/minepro-documentation"
                target="_blank"
                rel="noreferrer"
                className="glassButton"
              >
                <img
                  src="/icons/socials/gitbook.svg"
                  alt="gitbook icon"
                  width={32}
                  height={32}
                  className="mt-2"
                />
              </a>
            </div>

            {/* twitter */}
            <div className="glassButtonContainer">
              <a
                href="https://twitter.com/MineProBusiness"
                target="_blank"
                rel="noreferrer"
                className="glassButton"
              >
                <img
                  src="/icons/socials/twitter.svg"
                  alt="x icon"
                  width={24}
                  height={24}
                  className="mt-2"
                />
              </a>
            </div>

            {/* telegram */}
            <div className="glassButtonContainer">
              <a
                href="https://t.me/MineProBitcoin"
                target="_blank"
                rel="noreferrer"
                className="glassButton"
              >
                <img
                  src="/icons/socials/telegram.svg"
                  alt="x icon"
                  width={24}
                  height={24}
                  className="mt-2"
                />
              </a>
            </div>
          </div>
        </div>
      </div>
      {/* bottom section */}
      <div className="h-[75px] flex justify-center items-center px-4 sm:px-20">
        <p className="text-[16px] leading-6 text-white/60">
          © {year} MinePro | All rights reserved
        </p>
      </div>
    </footer>
  );
};

export default Footer;
