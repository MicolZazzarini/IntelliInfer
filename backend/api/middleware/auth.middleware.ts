import { Request, Response, NextFunction } from 'express';
import { ConcreteErrorCreator} from "../factory/ErrorCreator";
import {decodeToken, validateToken} from '../token'
import {UserRole} from "../static";

declare module 'express' {
    export interface Request {
        userEmail?: string;
        userRole?: string;
    }
}

export const verifyTokenSignature = async (req: Request, res: Response, next: NextFunction) => {
  try {
        let jwt: string | undefined = req.headers.authorization;


        if (!jwt) {
          return next(new ConcreteErrorCreator().createAuthenticationError().setInvalidToken().send(res));

        }

        if (jwt && jwt.toLowerCase().startsWith('bearer')) {
          jwt = jwt.slice('bearer'.length).trim();
          const decodedToken: any = await validateToken(jwt);

          req.userEmail = decodedToken.email;
          req.userRole = decodedToken.role;
          next();
        } else {
          return next(new ConcreteErrorCreator().createAuthenticationError().setInvalidSignature().send(res));

        }
  } catch (error: any) {
    return next(new ConcreteErrorCreator().createAuthenticationError().setInvalidToken().send(res));

  }
};

const verifyUserRole_ = (decodedToken: { role: string }, allowedAccessTypes: string[]): boolean => {
    // Controlla se il ruolo dell'utente è incluso nei ruoli consentiti
    return allowedAccessTypes.includes(decodedToken.role);
};

export const verifyUserRole =  (allowedAccessTypes: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
        const jwt: string | undefined = req.headers.authorization
        if(jwt !== undefined) {
            const token: string = jwt.slice('bearer'.length).trim()
            const decodedToken: any = decodeToken(token);
            const hasAccessToEndpoint: boolean = verifyUserRole_(decodedToken, allowedAccessTypes);
            if (hasAccessToEndpoint) {
                return next();
            } else {
                return next(new ConcreteErrorCreator().createAuthenticationError().setNotRightRole().send(res));
            }
        }
    } catch (error) {
      return next(new ConcreteErrorCreator().createAuthenticationError().setFailAuthUser().send(res));
    }
  };
};


export const verifyTokenExpiration =  (req: Request, res: Response, next: NextFunction) => {
  try {
    const jwt: string | undefined = req.headers.authorization
        if(jwt !== undefined) {
            const token: string = jwt.slice('bearer'.length).trim()
            const decodedToken: any = decodeToken(token);

            if (decodedToken.exp * 1000 < Date.now()) {
                next(new ConcreteErrorCreator().createAuthenticationError().setTokenExpired().send(res));
            } else {
                next();
            }
        }
  } catch (error) {
    next(new ConcreteErrorCreator().createAuthenticationError().setFailAuthUser().send(res));
  }
};

export const AuthUser = [
    verifyTokenSignature,
    verifyTokenExpiration,
    verifyUserRole([UserRole.USER,]),
]

export const AuthAdmin = [
    verifyTokenSignature,
    verifyTokenExpiration,
    verifyUserRole([UserRole.ADMIN,]),
]

export const AuthSystem = [
    verifyTokenSignature,
    verifyTokenExpiration,
    verifyUserRole([UserRole.ADMIN,]),
]

export const AuthMix= (arrayRole: string[])=> {
    return [
        verifyTokenSignature,
        verifyTokenExpiration,
        verifyUserRole(arrayRole),
    ]
}