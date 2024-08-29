"use client";

import React, { useState } from "react";

const navlink = [
  {
    title: "Our Website",
    link: "https://mineprobusiness.net",
  },
];

interface NavigationProps {
  identity?: string;
  loginCallback: () => void;
}

const Navigation = ({ identity, loginCallback }: NavigationProps) => {
  const scrollToSection = (section: string) => {
    const el = document.getElementById(section);
    console.log(section);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };
  const [navbar, setNavbar] = useState(false);

  return (
    <nav className="glassCard max-w-[1440px] w-full z-20 mt-4 md:mt-10 px-6 py-4 sm:py-6 mx-4 sm:mx-16 flex justify-between items-center">
      {/* logo */}
      <a
        href="https://mineprobusiness.net"
        target="_blank"
        rel="noreferrer"
        className="justify-self-start flex gap-2 items-center"
      >
        <img src="/logo-white.svg" alt="logo" width={36} height={36} />
        <p className=" text-[24px] font-medium text-white">MinePro</p>
      </a>

      {/* burger menu */}
      <button className="block lg:hidden" onClick={() => setNavbar(!navbar)}>
        <div className="orangeButton hamburgerBtn">
          {navbar ? (
            <img
              src="/icons/close-menu.svg"
              width={24}
              height={24}
              alt="logo"
            />
          ) : (
            <img
              src="/icons/hamburger-menu.svg"
              width={24}
              height={24}
              alt="logo"
            />
          )}
        </div>
      </button>

      <div
        className={`bg-black rounded-2xl z-50 absolute md:hidden left-0 w-full top-[88px] transition-all duration-200 ${
          navbar ? "flex flex-col" : "hidden"
        }`}
      >
        <div className="glassCarddrop p-5 gap-6 flex flex-col">
          <a
            href="https://minepro-1.gitbook.io/minepro-documentation"
            target="_blank"
            rel="noreferrer"
            className="text-white/40 hover:text-white"
            onClick={() => setNavbar(!navbar)}
          >
            Whitepaper
          </a>
          <a
            href="https://discord.gg/dWtWJjwNYy"
            target="_blank"
            rel="noreferrer"
            className="text-white/40 hover:text-white"
            onClick={() => setNavbar(!navbar)}
          >
            Discord
          </a>
          <a
            href="https://t.me/MineProBitcoin"
            target="_blank"
            rel="noreferrer"
            className="text-white/40 hover:text-white"
            onClick={() => setNavbar(!navbar)}
          >
            Telegram
          </a>
          {identity ? (
            <p>{identity}</p>
          ) : (
            <button className="orangeButton" onClick={loginCallback}>
              Connect with Internet Identity
            </button>
          )}
          {/* <ConnectWallet /> */}
        </div>
      </div>

      {/* links */}
      <div className="hidden lg:flex justify-self-center items-center gap-8 transition-all duration-200">
        {navlink.map((link, index) => (
          <button
            onClick={() => scrollToSection(link.link)}
            key={index}
            className="text-white/40 capitalize hover:text-white text-xs 2xl:text-base text-nowrap"
          >
            {link.title}
          </button>
        ))}
        <a
          href="https://minepro-1.gitbook.io/minepro-documentation"
          target="_blank"
          rel="noreferrer"
          className="text-white/40 capitalize hover:text-white text-xs 2xl:text-base text-nowrap"
        >
          Whitepaper
        </a>
        <a
          href="https://discord.gg/dWtWJjwNYy"
          target="_blank"
          rel="noreferrer"
          className="text-white/40 capitalize hover:text-white text-xs 2xl:text-base text-nowrap"
        >
          Discord
        </a>
        <a
          href="https://t.me/MineProBitcoin"
          target="_blank"
          rel="noreferrer"
          className="text-white/40 capitalize hover:text-white text-xs 2xl:text-base text-nowrap"
        >
          Telegram
        </a>
      </div>

      {/* wallet connect */}
      <div className="hidden lg:block justify-self-end w-fit float-end">
        {identity ? (
          <p>{identity}</p>
        ) : (
          <button className="orangeButton" onClick={loginCallback}>
            Connect with Internet Identity
          </button>
        )}
        {/* <ConnectWallet /> */}
      </div>
    </nav>
  );
};

export default Navigation;
