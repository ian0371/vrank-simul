import { ethers } from "hardhat";
import { Header, commiterAddress, parseExtraData } from "../lib/hardhat/utils";
import * as fs from "fs";

const period = 3600;
const alpha = 0.2;
let council: string[];
let blockRecords: BlockRecord[] = [];

type BlockRecord = {
  blockNum: number;
  voters: string[];
  nonvoters: string[];
};

async function getCouncil(blockNum: number): Promise<string[]> {
  const nonChecksum: string[] = await ethers.provider.send("klay_getCouncil", [blockNum]);
  // convert to checksum-addresses
  return nonChecksum.map(ethers.utils.getAddress);
}

function nonVoteCnt(slot: number, addr: string) {
  let ret = 0;
  for (let i = 0; i <= slot; i++) {
    const record = blockRecords[i];
    if (record.nonvoters.includes(addr)) {
      ret++;
    }
  }
  return ret;
}

function findLongestContSubseqLen(arr: number[]): number {
  if (arr.length == 0) {
    return 0;
  }

  let maxLength = 1;
  let currentLength = 1;

  for (let i = 1; i < arr.length; i++) {
    if (arr[i] - 1 == arr[i - 1]) {
      currentLength++;
    } else {
      maxLength = Math.max(maxLength, currentLength);
      currentLength = 1;
    }
  }

  maxLength = Math.max(maxLength, currentLength);
  return maxLength;
}

function voted(slot: number, addr: string) {
  const record = blockRecords[slot];
  if (record.voters.includes(addr)) {
    return true;
  }
  return false;
}

function maxNonVoteCntCons(slot: number, addr: string) {
  const nonvotedList = [];
  for (let i = 0; i <= slot; i++) {
    const record = blockRecords[i];
    if (!voted(slot, addr)) {
      nonvotedList.push(record.blockNum);
    }
  }
  return findLongestContSubseqLen(nonvotedList);
}

function voteAdd(slot: number, addr: string) {
  return (50 * slot) / period;
}

function voteDeduct(slot: number, addr: string) {
  return nonVoteCnt(slot, addr) * alpha + Math.floor(maxNonVoteCntCons(slot, addr) * 2 * alpha);
}

function voterScore(slot: number, addr: string) {
  return 50 + voteAdd(slot, addr) - voteDeduct(slot, addr);
}

async function getRecord(blockNum: number): Promise<BlockRecord> {
  const header: Header = await ethers.provider.send("klay_getHeaderByNumber", [blockNum]);
  const extraData = parseExtraData(header.extraData);
  const record: BlockRecord = { blockNum, voters: [], nonvoters: [] };
  for (let i = 0; i < extraData.committedSeal.length; i++) {
    record.voters.push(commiterAddress(header, i));
  }
  for (let i = 0; i < council.length; i++) {
    if (!record.voters.includes(council[i])) {
      record.nonvoters.push(council[i]);
    }
  }
  return record;
}

// startBlock, endBlock both inclusive
async function fillRecords(startBlock: number, endBlock: number) {
  if (startBlock % period != 0) {
    throw new Error("startBlock must be multiple of period");
  }

  for (let block = startBlock; block <= endBlock; block++) {
    const record = await getRecord(block);
    blockRecords.push(record);
  }
}

async function main() {
  const blockNum = 126007200;
  council = await getCouncil(blockNum);
  await fillRecords(blockNum, blockNum + period);

  const fn = `output_${blockNum}.csv`;
  fs.writeFileSync(fn, `addr`);
  for (let i = 0; i <= period; i++) {
    fs.appendFileSync(fn, `, ${blockNum + i}`);
  }
  fs.appendFileSync(fn, `\n`);

  for (const addr of council) {
    fs.appendFileSync(fn, `${addr}`);
    for (let i = 0; i <= period; i++) {
      fs.appendFileSync(fn, `,${voterScore(i, addr)}`);
    }
    fs.appendFileSync(fn, `\n`);
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
