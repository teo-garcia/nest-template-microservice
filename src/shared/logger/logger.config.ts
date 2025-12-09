import "winston-daily-rotate-file";

import { utilities as nestWinstonModuleUtilities } from "nest-winston";
import * as winston from "winston";

type TransformableInfo = {
  level: string;
  message: string;
  context?: string;
  trace?: string;
  [key: string]: unknown;
};

const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  verbose: 4,
};

export const formatMeta = (
  meta: TransformableInfo,
): Record<string, unknown> => {
  const splatKey = Symbol.for("splat");
  const splat = Reflect.get(meta, splatKey) as unknown[];
  if (splat?.[0]) {
    const cleanedMeta = { ...meta };
    Reflect.deleteProperty(cleanedMeta, splatKey);
    return { ...cleanedMeta, ...(splat[0] as Record<string, unknown>) };
  }
  return meta;
};

export const createLoggerConfig = (
  environment: string,
): winston.LoggerOptions => {
  const isProduction = environment === "production";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formatMessage = winston.format((info: any) => {
    const { level, message, context, trace, ...meta } = info;
    return {
      timestamp: new Date().toISOString(),
      level,
      context,
      message,
      ...(trace && { trace }),
      ...(Object.keys(meta).length > 0 && {
        meta: formatMeta(meta as TransformableInfo),
      }),
    };
  });

  const consoleFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.ms(),
    nestWinstonModuleUtilities.format.nestLike("NestApp", {
      prettyPrint: !isProduction,
      colors: !isProduction,
    }),
  );

  const jsonFormat = winston.format.combine(
    winston.format.timestamp(),
    formatMessage(),
    winston.format.json(),
  );

  const fileRotateTransport = new winston.transports.DailyRotateFile({
    filename: "logs/application-%DATE%.log",
    datePattern: "YYYY-MM-DD",
    zippedArchive: true,
    maxSize: "20m",
    maxFiles: "14d",
    format: jsonFormat,
    level: isProduction ? "info" : "debug",
  });

  const errorRotateTransport = new winston.transports.DailyRotateFile({
    filename: "logs/error-%DATE%.log",
    datePattern: "YYYY-MM-DD",
    zippedArchive: true,
    maxSize: "20m",
    maxFiles: "14d",
    format: jsonFormat,
    level: "error",
  });

  return {
    levels: logLevels,
    level: isProduction ? "info" : "debug",
    transports: [
      new winston.transports.Console({
        format: consoleFormat,
      }),
      fileRotateTransport,
      errorRotateTransport,
    ],
  };
};
