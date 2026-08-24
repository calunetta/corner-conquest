'use client';

import React from 'react';
import Image from 'next/image';

export function LobbyBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none select-none">
      {/* Deep Ocean Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-950/80 via-background to-black" />

      {/* Ambient Radial Bioluminescent Glows */}
      <div className="absolute -top-32 -left-32 w-[550px] h-[550px] bg-cyan-500/15 rounded-full blur-[140px] animate-pulse" />
      <div className="absolute -bottom-32 -right-32 w-[550px] h-[550px] bg-purple-600/15 rounded-full blur-[140px] animate-pulse [animation-delay:3s]" />
      <div className="absolute top-1/3 right-1/4 w-[450px] h-[450px] bg-amber-500/10 rounded-full blur-[120px] animate-pulse [animation-delay:1.5s]" />
      <div className="absolute top-2/3 left-1/4 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[120px] animate-pulse [animation-delay:2.5s]" />

      {/* Subtle Grid Water Texture */}
      <div className="absolute inset-0 bg-water-pattern opacity-20 mix-blend-overlay" />

      {/* Floating Tactical Island 1 (Top Left) - Blue Citadel */}
      <div className="absolute top-[6%] left-[3%] opacity-45 hover:opacity-85 transition-opacity duration-700 hidden md:block animate-bounce [animation-duration:8s]">
        <div className="relative w-28 h-28 rounded-2xl bg-terrain bg-cover bg-center shadow-2xl border border-blue-400/30 rotate-6 p-2 flex flex-col items-center justify-center">
          <Image
            src="/sprites/castle_blue.png"
            alt="Blue Castle"
            width={48}
            height={48}
            className="drop-shadow-lg object-contain"
            unoptimized
          />
          <div className="absolute -bottom-2 -right-2">
            <Image
              src="/sprites/blue.gif"
              alt="Blue Knight"
              width={32}
              height={32}
              className="drop-shadow-md object-contain"
              unoptimized
            />
          </div>
        </div>
      </div>

      {/* Floating Tactical Island 2 (Top Center-Right) - Wild Bear Cave */}
      <div className="absolute top-[4%] left-[45%] opacity-35 hover:opacity-75 transition-opacity duration-700 hidden xl:block animate-bounce [animation-duration:9s] [animation-delay:1.8s]">
        <div className="relative w-24 h-24 rounded-2xl bg-terrain bg-cover bg-center shadow-2xl border border-white/20 -rotate-3 p-1.5 flex flex-col items-center justify-center">
          <Image
            src="/sprites/bear_idle.gif"
            alt="Wild Bear"
            width={40}
            height={40}
            className="drop-shadow-md object-contain"
            unoptimized
          />
          <div className="absolute -top-2 -left-2">
            <Image
              src="/sprites/pine_tree.gif"
              alt="Pine Tree"
              width={26}
              height={26}
              className="drop-shadow-sm object-contain"
              unoptimized
            />
          </div>
        </div>
      </div>

      {/* Floating Tactical Island 3 (Top Right) - Red Outpost */}
      <div className="absolute top-[8%] right-[4%] opacity-45 hover:opacity-85 transition-opacity duration-700 hidden md:block animate-bounce [animation-duration:9.5s] [animation-delay:2s]">
        <div className="relative w-32 h-32 rounded-2xl bg-terrain bg-cover bg-center shadow-2xl border border-red-500/30 rotate-12 p-2 flex flex-col items-center justify-center">
          <Image
            src="/sprites/castle_red.png"
            alt="Red Castle"
            width={48}
            height={48}
            className="drop-shadow-lg object-contain"
            unoptimized
          />
          <div className="absolute -bottom-2 -left-2">
            <Image
              src="/sprites/red.gif"
              alt="Red Knight"
              width={32}
              height={32}
              className="drop-shadow-md object-contain"
              unoptimized
            />
          </div>
          <div className="absolute -top-1 -right-1">
            <Image
              src="/sprites/lancer_idle.gif"
              alt="Red Lancer"
              width={28}
              height={28}
              className="drop-shadow-sm object-contain"
              unoptimized
            />
          </div>
        </div>
      </div>

      {/* Floating Tactical Island 4 (Mid-Left) - Yellow Sun Citadel */}
      <div className="absolute top-[42%] left-[2%] opacity-40 hover:opacity-80 transition-opacity duration-700 hidden lg:block animate-bounce [animation-duration:10s] [animation-delay:0.8s]">
        <div className="relative w-28 h-28 rounded-2xl bg-terrain bg-cover bg-center shadow-2xl border border-yellow-400/30 -rotate-12 p-2 flex flex-col items-center justify-center">
          <Image
            src="/sprites/castle_yellow.png"
            alt="Yellow Castle"
            width={44}
            height={44}
            className="drop-shadow-lg object-contain"
            unoptimized
          />
          <div className="absolute -bottom-1 -right-1">
            <Image
              src="/sprites/yellow.gif"
              alt="Yellow Knight"
              width={30}
              height={30}
              className="drop-shadow-md object-contain"
              unoptimized
            />
          </div>
          <div className="absolute -top-2 -left-1">
            <Image
              src="/sprites/farm_yellow.gif"
              alt="Yellow Farm"
              width={24}
              height={24}
              className="drop-shadow-sm object-contain"
              unoptimized
            />
          </div>
        </div>
      </div>

      {/* Floating Tactical Island 5 (Mid-Right) - Purple Mystic Bastion */}
      <div className="absolute top-[44%] right-[2%] opacity-40 hover:opacity-80 transition-opacity duration-700 hidden lg:block animate-bounce [animation-duration:11.5s] [animation-delay:1.2s]">
        <div className="relative w-28 h-28 rounded-2xl bg-terrain bg-cover bg-center shadow-2xl border border-purple-400/30 rotate-6 p-2 flex flex-col items-center justify-center">
          <Image
            src="/sprites/castle_purple.png"
            alt="Purple Castle"
            width={44}
            height={44}
            className="drop-shadow-lg object-contain"
            unoptimized
          />
          <div className="absolute -bottom-1 -left-1">
            <Image
              src="/sprites/purple.gif"
              alt="Purple Knight"
              width={30}
              height={30}
              className="drop-shadow-md object-contain"
              unoptimized
            />
          </div>
          <div className="absolute -top-2 -right-1">
            <Image
              src="/sprites/collector_purple_idle.gif"
              alt="Purple Collector"
              width={24}
              height={24}
              className="drop-shadow-sm object-contain"
              unoptimized
            />
          </div>
        </div>
      </div>

      {/* Floating Tactical Island 6 (Bottom Left) - Minotaur Lair & Gold */}
      <div className="absolute bottom-[8%] left-[5%] opacity-40 hover:opacity-80 transition-opacity duration-700 hidden md:block animate-bounce [animation-duration:11s] [animation-delay:1s]">
        <div className="relative w-32 h-32 rounded-2xl bg-terrain bg-cover bg-center shadow-2xl border border-amber-500/30 -rotate-6 p-2 flex flex-col items-center justify-center">
          <Image
            src="/sprites/minotaur_idle.gif"
            alt="Minotaur Monster"
            width={52}
            height={52}
            className="drop-shadow-lg object-contain"
            unoptimized
          />
          <div className="absolute top-1 left-2">
            <Image
              src="/sprites/gold.gif"
              alt="Gold Treasure"
              width={26}
              height={26}
              className="drop-shadow-md object-contain"
              unoptimized
            />
          </div>
          <div className="absolute -bottom-1 -right-1">
            <Image
              src="/sprites/medium_rock.gif"
              alt="Rock"
              width={20}
              height={20}
              className="drop-shadow-sm object-contain"
              unoptimized
            />
          </div>
        </div>
      </div>

      {/* Floating Tactical Island 7 (Bottom Right) - Ogre Pasture */}
      <div className="absolute bottom-[8%] right-[5%] opacity-40 hover:opacity-80 transition-opacity duration-700 hidden md:block animate-bounce [animation-duration:10.5s] [animation-delay:0.5s]">
        <div className="relative w-30 h-30 rounded-2xl bg-terrain bg-cover bg-center shadow-2xl border border-emerald-500/30 -rotate-12 p-2 flex flex-col items-center justify-center">
          <Image
            src="/sprites/ogre_idle.gif"
            alt="Ogre Monster"
            width={48}
            height={48}
            className="drop-shadow-lg object-contain"
            unoptimized
          />
          <div className="absolute -top-1 -right-1">
            <Image
              src="/sprites/sheep.gif"
              alt="Pasture Sheep"
              width={24}
              height={24}
              className="drop-shadow-md object-contain"
              unoptimized
            />
          </div>
          <div className="absolute -bottom-1 -left-1">
            <Image
              src="/sprites/tree.gif"
              alt="Tree"
              width={24}
              height={24}
              className="drop-shadow-sm object-contain"
              unoptimized
            />
          </div>
        </div>
      </div>

      {/* Naval Patrol Fleet Sailing across */}
      <div className="absolute top-[35%] left-[8%] opacity-35 hover:opacity-75 transition-opacity duration-700 hidden xl:block animate-pulse [animation-duration:7s]">
        <Image
          src="/sprites/boat.gif"
          alt="Patrol Boat 1"
          width={44}
          height={44}
          className="drop-shadow-md object-contain -rotate-6"
          unoptimized
        />
      </div>

      <div className="absolute bottom-[28%] right-[12%] opacity-30 hover:opacity-75 transition-opacity duration-700 hidden xl:block animate-pulse [animation-duration:8.5s] [animation-delay:2s]">
        <Image
          src="/sprites/boat.gif"
          alt="Patrol Boat 2"
          width={38}
          height={38}
          className="drop-shadow-md object-contain rotate-12"
          unoptimized
        />
      </div>

      {/* Subtle Fog & Lighting Particle Highlights */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/50" />
    </div>
  );
}
