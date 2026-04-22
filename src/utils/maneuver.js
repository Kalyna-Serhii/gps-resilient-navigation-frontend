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
