import { ethers } from "hardhat";
import RLP from "rlp";

export type ExtraData = {
  vanity: Buffer; // 32B
  validators: string[];
  seal: Buffer;
  committedSeal: Buffer[];
};

export type Header = {
  hash: string;
  parentHash: string;
  reward: string;
  stateRoot: string;
  transactionsRoot: string;
  receiptsRoot: string;
  logsBloom: string;
  blockScore: string;
  number: number;
  gasUsed: number;
  timestamp: number;
  timestampFoS: number;
  extraData: string;
  governanceData: string;
  voteData: string;
  baseFeePerGas?: string;
};

export function bufToStr(buf: Buffer) {
  return addHexPrefix(buf.toString("hex"));
}

export function addHexPrefix(msg: string): string {
  if (!msg.startsWith("0x")) {
    return "0x" + msg;
  }
  return msg;
}

export function lstripHex(msg: string): string {
  if (msg.startsWith("0x")) {
    return msg.slice(2);
  }
  return msg;
}

export function strToBuf(addr: string): Buffer {
  return Buffer.from(lstripHex(addr), "hex");
}

export function rlpEncodeExtraData(extraData: ExtraData): Buffer {
  return Buffer.from(RLP.encode([extraData.validators.map(strToBuf), extraData.seal, extraData.committedSeal]));
}

export function calcHeaderHash(header: Header, keepSeal: boolean): string {
  const extraData = parseExtraData(header.extraData);
  if (!keepSeal) {
    extraData.seal = Buffer.alloc(0);
  }
  extraData.committedSeal = [];

  const extraDataForHash = Buffer.concat([extraData.vanity, rlpEncodeExtraData(extraData)]);

  const blockData = [
    header.parentHash,
    header.reward,
    header.stateRoot,
    header.transactionsRoot,
    header.receiptsRoot,
    header.logsBloom,
    header.blockScore,
    header.number,
    header.gasUsed,
    header.timestamp,
    header.timestampFoS,
    extraDataForHash,
    header.governanceData,
    header.voteData,
  ];
  if (header.baseFeePerGas != null) {
    blockData.push(header.baseFeePerGas);
  }

  const encoded = Buffer.from(RLP.encode(blockData));
  return ethers.utils.keccak256(encoded);
}

export function commiterAddress(header: Header, idx: number) {
  const extraData = parseExtraData(header.extraData);
  const hash = strToBuf(lstripHex(header.hash));
  const commitMsg = strToBuf("0x02");
  const proposerSeal = Buffer.concat([hash, commitMsg]);
  const msgHash = ethers.utils.keccak256(proposerSeal);
  const pubkey = ethers.utils.recoverPublicKey(msgHash, extraData.committedSeal[idx]);
  return ethers.utils.computeAddress(pubkey);
}

export function parseExtraData(extraData: string): ExtraData {
  const buf = Buffer.from(lstripHex(extraData), "hex");
  const istanbulExtra = RLP.decode(buf.slice(32));

  const validators = (istanbulExtra[0] as Buffer[]).map(bufToStr);

  const ret: ExtraData = {
    vanity: buf.slice(32),
    validators,
    seal: istanbulExtra[1] as Buffer,
    committedSeal: istanbulExtra[2] as Buffer[],
  };

  return ret;
}
