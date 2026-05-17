import NearMeIcon from '@mui/icons-material/NearMe';
import PlaceIcon from '@mui/icons-material/Place';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import TurnLeftIcon from '@mui/icons-material/TurnLeft';
import TurnRightIcon from '@mui/icons-material/TurnRight';
import TurnSlightLeftIcon from '@mui/icons-material/TurnSlightLeft';
import TurnSlightRightIcon from '@mui/icons-material/TurnSlightRight';
import TurnSharpLeftIcon from '@mui/icons-material/TurnSharpLeft';
import TurnSharpRightIcon from '@mui/icons-material/TurnSharpRight';
import UTurnLeftIcon from '@mui/icons-material/UTurnLeft';
import RoundaboutRightIcon from '@mui/icons-material/RoundaboutRight';
import ForkLeftIcon from '@mui/icons-material/ForkLeft';
import ForkRightIcon from '@mui/icons-material/ForkRight';
import RampLeftIcon from '@mui/icons-material/RampLeft';
import RampRightIcon from '@mui/icons-material/RampRight';
import MergeIcon from '@mui/icons-material/Merge';

const MOD = {
  'left': 'ліворуч',
  'right': 'праворуч',
  'straight': 'прямо',
  'slight left': 'плавно ліворуч',
  'slight right': 'плавно праворуч',
  'sharp left': 'різко ліворуч',
  'sharp right': 'різко праворуч',
  'uturn': 'розворот',
};

const DIRECTION_ICONS = {
  'left': TurnLeftIcon,
  'right': TurnRightIcon,
  'straight': ArrowUpwardIcon,
  'slight left': TurnSlightLeftIcon,
  'slight right': TurnSlightRightIcon,
  'sharp left': TurnSharpLeftIcon,
  'sharp right': TurnSharpRightIcon,
  'uturn': UTurnLeftIcon,
};

export function getStepIcon(maneuver) {
  const type = maneuver?.type;
  const mod = maneuver?.modifier;

  switch (type) {
    case 'depart':
      return NearMeIcon;
    case 'arrive':
      return PlaceIcon;
    case 'roundabout':
    case 'roundabout turn':
    case 'exit roundabout':
      return RoundaboutRightIcon;
    case 'fork':
      return mod?.includes('left') ? ForkLeftIcon : ForkRightIcon;
    case 'on ramp':
    case 'off ramp':
      return mod?.includes('left') ? RampLeftIcon : RampRightIcon;
    case 'merge':
      return MergeIcon;
    default:
      return DIRECTION_ICONS[mod] || ArrowUpwardIcon;
  }
}

const join = (...parts) => parts.filter(Boolean).join(' ');

export function describeStep({ maneuver, name }) {
  const type = maneuver?.type;
  const mod = maneuver?.modifier;
  const modUa = mod ? MOD[mod] || mod : '';
  const street = name || '';

  switch (type) {
    case 'depart':
      return join('Рушайте', modUa, street && `по ${street}`);
    case 'turn':
      return join(mod === 'straight' ? 'Їдьте прямо' : `Поверніть ${modUa}`, street && `на ${street}`);
    case 'new name':
      return join(mod === 'straight' ? 'Продовжуйте прямо' : `Тримайтеся ${modUa}`, street && `— ${street}`);
    case 'continue':
      return join(mod === 'straight' ? 'Продовжуйте прямо' : `Продовжуйте ${modUa}`, street && `по ${street}`);
    case 'fork':
      return join(`На розвилці тримайтеся ${modUa}`, street && `— ${street}`);
    case 'end of road':
      return join(`У кінці дороги поверніть ${modUa}`, street && `на ${street}`);
    case 'roundabout':
    case 'roundabout turn':
      return join('На кільцевій', modUa, street && `— ${street}`);
    case 'exit roundabout':
      return join('Виїжджайте з кільцевої', modUa, street && `на ${street}`);
    case 'on ramp':
      return join(`В'їжджайте на трасу ${modUa}`, street && `— ${street}`);
    case 'off ramp':
      return join(`З'їжджайте з траси ${modUa}`, street && `— ${street}`);
    case 'merge':
      return join(`Зливайтеся ${modUa}`, street && `— ${street}`);
    case 'arrive':
      return 'Прибуття до пункту призначення';
    default:
      return join(type, modUa, street && `— ${street}`);
  }
}
