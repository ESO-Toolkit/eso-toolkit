import { Avatar, SxProps, Theme } from '@mui/material';
import React from 'react';

// Import all boss avatar assets as ES modules for proper Vite handling
import foundationStoneAtronachAvatar from '@/assets/Aetherian Archive/Boss Avatars/foundation stone atronach.png';
import lightningStormAtronachAvatar from '@/assets/Aetherian Archive/Boss Avatars/lightning storm atronach.png';
import theMageAvatar from '@/assets/Aetherian Archive/Boss Avatars/the mage.png';
import varlarielAvatar from '@/assets/Aetherian Archive/Boss Avatars/varariel.png';
import saintFelmsTheBoldAvatar from '@/assets/Asylum Sanctorium/Boss Avatars/saint felms the bold.png';
import saintLlothisThePiousAvatar from '@/assets/Asylum Sanctorium/Boss Avatars/saint llothis the pious.png';
import saintOlmsTheJustAvatar from '@/assets/Asylum Sanctorium/Boss Avatars/saint olms the just.png';
import shadeOfGalenweAvatar from '@/assets/Cloudrest/Boss Avatars/shade of galenwe.png';
import shadeOfRelequenAvatar from '@/assets/Cloudrest/Boss Avatars/shade of relequen.png';
import shadeOfSiroriaAvatar from '@/assets/Cloudrest/Boss Avatars/shade of siroria.png';
import zmajaAvatar from "@/assets/Cloudrest/Boss Avatars/z'maja.png";
import bowBreakerAvatar from '@/assets/Dreadsail Reef/Boss Avatars/Bow Breaker.png';
import lylanarAndTurlassilAvatar from '@/assets/Dreadsail Reef/Boss Avatars/Lylanar and Turlassil.png';
import reefGuardianAvatar from '@/assets/Dreadsail Reef/Boss Avatars/Reef Guardian.png';
import sailRipperAvatar from '@/assets/Dreadsail Reef/Boss Avatars/Sail Ripper.png';
import tidebornTaleriaAvatar from '@/assets/Dreadsail Reef/Boss Avatars/Tideborn Taleria.png';
import raKotuAvatar from '@/assets/Hel Ra Citadel/Boss Avatars/ra kotu.png';
import theWarriorAvatar from '@/assets/Hel Ra Citadel/Boss Avatars/the warrior.png';
import theYokedasAvatar from '@/assets/Hel Ra Citadel/Boss Avatars/the yokedas.png';
import captainVrolAvatar from "@/assets/Kyne's Aegis/Boss Avatars/Captain Vrol.png";
import lordFalgravnAvatar from "@/assets/Kyne's Aegis/Boss Avatars/Lord Falgravn.png";
import yandirTheButcherAvatar from "@/assets/Kyne's Aegis/Boss Avatars/Yandir the Butcher.png";
import cavotAgnanAvatar from '@/assets/Lucent Citadel/Boss Avatars/cavot agnan.png';
import darielLemondsAvatar from '@/assets/Lucent Citadel/Boss Avatars/dariel lemonds.png';
import orphicShatteredShardAvatar from '@/assets/Lucent Citadel/Boss Avatars/orphic shattered shard.png';
import xorynAvatar from '@/assets/Lucent Citadel/Boss Avatars/xoryn.png';
import zilyseetAvatar from '@/assets/Lucent Citadel/Boss Avatars/zilyseet.png';
import rakkhatAvatar from '@/assets/Maw of Lorkhaj/Boss Avatars/rakkhat.png';
import theTwinsAvatar from '@/assets/Maw of Lorkhaj/Boss Avatars/the twins.png';
import zhajhassaTheForgottenAvatar from "@/assets/Maw of Lorkhaj/Boss Avatars/Zhaj'hassa the forgotten.png";
import bloodDrinkerThisaAvatar from '@/assets/Ossein Cage/Boss Avatars/blood drinker thisa.png';
import hallOfFleshcraftAvatar from '@/assets/Ossein Cage/Boss Avatars/hall of fleshcraft.png';
import jynorahAndSkorkhifAvatar from '@/assets/Ossein Cage/Boss Avatars/jynorah and skorkhif.png';
import overfiendKazpianAvatar from '@/assets/Ossein Cage/Boss Avatars/overfiend kazpian.png';
import redWitchGednaRelvelAvatar from '@/assets/Ossein Cage/Boss Avatars/red witch gedna relvel.png';
import torturedRanyuAvatar from '@/assets/Ossein Cage/Boss Avatars/tortued ranyu.png';
import ashTitanAvatar from '@/assets/Rockgrove/Boss Avatars/ash titan.png';
import basksInSnakesAvatar from '@/assets/Rockgrove/Boss Avatars/basks-in-snakes.png';
import flameHeraldBahseiAvatar from '@/assets/Rockgrove/Boss Avatars/flame-herald bahsei.png';
import oaxiltsoAvatar from '@/assets/Rockgrove/Boss Avatars/oaxiltso.png';
import xalvakkaAvatar from '@/assets/Rockgrove/Boss Avatars/xalvakka.png';
import ozaraAvatar from '@/assets/Sanctum Ophidia/Boss Avatars/ozara.png';
import possessedManticoraAvatar from '@/assets/Sanctum Ophidia/Boss Avatars/possessed mantikora.png';
import stonebreakerAvatar from '@/assets/Sanctum Ophidia/Boss Avatars/stonebreaker.png';
import theSerpentAvatar from '@/assets/Sanctum Ophidia/Boss Avatars/the serpent.png';
import archcustodianAvatar from '@/assets/The Halls of Fabrication/Boss Avatars/archcustodian.png';
import assemblyGeneralAvatar from '@/assets/The Halls of Fabrication/Boss Avatars/assembly general.png';
import pinnacleFactotumAvatar from '@/assets/The Halls of Fabrication/Boss Avatars/pinnacle factotum.png';
import theHunterKillersAvatar from '@/assets/The Halls of Fabrication/Boss Avatars/the hunter killers.png';
import theRefabricationCommitteeAvatar from '@/assets/The Halls of Fabrication/Boss Avatars/the refabrication committee.png';

// Boss avatar mapping using imported ES modules
const bossAvatars: Record<string, string> = {
  // Kyne's Aegis
  'Lord Falgravn': lordFalgravnAvatar,
  Falgraven: lordFalgravnAvatar,
  'Captain Vrol': captainVrolAvatar,
  Vrol: captainVrolAvatar,
  'Yandir the Butcher': yandirTheButcherAvatar,

  // Ossein Cage
  'Blood Drinker Thisa': bloodDrinkerThisaAvatar,
  'Hall of Fleshcraft': hallOfFleshcraftAvatar,
  'Jynorah and Skorkhif': jynorahAndSkorkhifAvatar,
  'Overfiend Kazpian': overfiendKazpianAvatar,
  'Red Witch Gedna Relvel': redWitchGednaRelvelAvatar,
  'Tortured Ranyu': torturedRanyuAvatar,

  // Dreadsail Reef
  'Bow Breaker': bowBreakerAvatar,
  'Lylanar and Turlassil': lylanarAndTurlassilAvatar,
  'Reef Guardian': reefGuardianAvatar,
  'Sail Ripper': sailRipperAvatar,
  'Tideborn Taleria': tidebornTaleriaAvatar,

  // Hel Ra Citadel
  'Ra Kotu': raKotuAvatar,
  'The Warrior': theWarriorAvatar,
  'The Yokedas': theYokedasAvatar,
  "Yokeda Rok'dun": theYokedasAvatar,
  Yokedas: theYokedasAvatar,

  // Asylum Sanctorium
  'Saint Felms the Bold': saintFelmsTheBoldAvatar,
  'Lord Felms': saintFelmsTheBoldAvatar,
  'Saint Felms': saintFelmsTheBoldAvatar,
  'Saint Llothis the Pious': saintLlothisThePiousAvatar,
  'Saint Llothis': saintLlothisThePiousAvatar,
  'Saint Olms the Just': saintOlmsTheJustAvatar,
  'Saint Olms': saintOlmsTheJustAvatar,

  // Rockgrove
  'Ash Titan': ashTitanAvatar,
  'Basks-in-Snakes': basksInSnakesAvatar,
  'Basks-In-Snakes': basksInSnakesAvatar,
  'Flame-Herald Bahsei': flameHeraldBahseiAvatar,
  Oaxiltso: oaxiltsoAvatar,
  Xalvakka: xalvakkaAvatar,

  // Aetherian Archive
  'Foundation Stone Atronach': foundationStoneAtronachAvatar,
  'Storm Atronach': foundationStoneAtronachAvatar,
  'Lightning Storm Atronach': lightningStormAtronachAvatar,
  'Stone Atronach': lightningStormAtronachAvatar,
  'The Mage': theMageAvatar,
  Varlariel: varlarielAvatar,

  // Cloudrest
  'Shade of Galenwe': shadeOfGalenweAvatar,
  Galenwe: shadeOfGalenweAvatar,
  'Shade of Relequen': shadeOfRelequenAvatar,
  Relequen: shadeOfRelequenAvatar,
  'Shade of Siroria': shadeOfSiroriaAvatar,
  Siroria: shadeOfSiroriaAvatar,
  "Z'maja": zmajaAvatar,

  // Sanctum Ophidia
  Ozara: ozaraAvatar,
  'Possessed Manticora': possessedManticoraAvatar,
  Stonebreaker: stonebreakerAvatar,
  'The Serpent': theSerpentAvatar,
  Serpent: theSerpentAvatar,

  // Halls of Fabrication
  Archcustodian: archcustodianAvatar,
  'Assembly General': assemblyGeneralAvatar,
  'Hunter-Killer Fabricant': theHunterKillersAvatar,
  'Pinnacle Factotum': pinnacleFactotumAvatar,
  'The Refabrication Committee': theRefabricationCommitteeAvatar,

  // Lucent Citadel
  'Cavot Agnan': cavotAgnanAvatar,
  'Dariel Lemonds': darielLemondsAvatar,
  'Count Ryelaz': darielLemondsAvatar,
  'Orphic Shattered Shard': orphicShatteredShardAvatar,
  Xoryn: xorynAvatar,
  Zilyseet: zilyseetAvatar,
  Zilyesset: zilyseetAvatar,
  'Baron Rize': xorynAvatar,
  Jresazzel: orphicShatteredShardAvatar,
  Xynizata: cavotAgnanAvatar,

  // Maw of Lorkhaj
  "Zhaj'hassa the Forgotten": zhajhassaTheForgottenAvatar,
  Rakkhat: rakkhatAvatar,
  'The Twins': theTwinsAvatar,
  Vashai: theTwinsAvatar,
};

function getBossAvatarSrc(bossName: string): string | null {
  // Remove instance numbers and extra text to match avatar keys
  const cleanName = bossName.replace(/#\d+$/, '').trim();
  return bossAvatars[cleanName] || null;
}

export interface BossAvatarProps {
  bossName: string;
  size?: number;
  sx?: SxProps<Theme>;
}

export const BossAvatar: React.FC<BossAvatarProps> = ({ bossName, size = 32, sx = {} }) => {
  const avatarSrc = getBossAvatarSrc(bossName);

  if (!avatarSrc) {
    return null;
  }

  return (
    <Avatar
      src={avatarSrc}
      alt={bossName}
      sx={{
        width: size,
        height: size,
        border: '1.5px solid #b3b3b3f2',
        boxShadow:
          'inset 0 2px 4px rgb(0 0 0 / 100%), 0 0 0 1px rgb(255 255 255 / 18%), 0 0 10px rgb(255 255 255 / 25%), 0 2px 6px rgb(0 0 0 / 60%)',
        ...sx,
      }}
    />
  );
};

// Export the function for backwards compatibility if needed
export { getBossAvatarSrc };
