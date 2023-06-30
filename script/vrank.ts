import { ethers } from "hardhat";
import { Header, commiterAddress, parseExtraData } from "../lib/hardhat/utils";
import * as fs from "fs";

const period = 3600;
const alpha = 0.2;
let council: string[];
let blockRecords: BlockRecord[] = [];

type BlockRecord = {
  blockNum: number;
  voters: number[];
  nonvoters: number[];
};

async function getCouncil(blockNum: number): Promise<string[]> {
  const nonChecksum: string[] = await ethers.provider.send("klay_getCouncil", [blockNum]);
  // convert to checksum-addresses
  return nonChecksum.map(ethers.utils.getAddress);
}

function voteCnt(slot: number, valIdx: number) {
  let ret = 0;
  for (let i = 0; i <= slot; i++) {
    const record = blockRecords[i];
    if (record.voters.includes(valIdx)) {
      ret++;
    }
  }
  return ret;
}

function nonVoteCnt(slot: number, valIdx: number) {
  let ret = 0;
  for (let i = 0; i <= slot; i++) {
    const record = blockRecords[i];
    if (record.nonvoters.includes(valIdx)) {
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

function voted(slot: number, valIdx: number) {
  const record = blockRecords[slot];
  if (record.voters.includes(valIdx)) {
    return true;
  }
  return false;
}

function maxNonVoteCntCons(slot: number, valIdx: number) {
  const nonvotedList = [];
  for (let i = 0; i <= slot; i++) {
    const record = blockRecords[i];
    if (!voted(i, valIdx)) {
      nonvotedList.push(record.blockNum);
    }
  }
  return findLongestContSubseqLen(nonvotedList);
}

function voteAdd(slot: number, valIdx: number) {
  return (50 * slot) / period;
}

function voteDeduct(slot: number, valIdx: number) {
  return nonVoteCnt(slot, valIdx) * alpha + Math.floor(maxNonVoteCntCons(slot, valIdx) * 2 * alpha);
}

function voterScore(slot: number, valIdx: number) {
  return 50 + voteAdd(slot, valIdx) - voteDeduct(slot, valIdx);
}

async function getRecord(blockNum: number): Promise<BlockRecord> {
  const header: Header = await ethers.provider.send("klay_getHeaderByNumber", [blockNum]);
  const extraData = parseExtraData(header.extraData);
  const record: BlockRecord = { blockNum, voters: [], nonvoters: [] };
  for (let i = 0; i < extraData.committedSeal.length; i++) {
    const addr = commiterAddress(header, i);
    record.voters.push(council.indexOf(addr));
  }
  for (let i = 0; i < council.length; i++) {
    if (!record.voters.includes(i)) {
      record.nonvoters.push(i);
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
    if (block % 100 == 0) {
      console.log(`Downloading ${block}`);
    }
  }
}

// column: slot, v1 score, v2 score, v3 score, ...
function output1(fn: string) {
  if (fs.existsSync(fn)) {
    throw new Error(`${fn} already exists`);
  }
  let row = "slot";
  for (const addr of council) {
    row += `,${addr} score`;
  }
  row += "\n";
  fs.writeFileSync(fn, row);

  for (let i = 0; i <= period; i++) {
    row = "${i}";
    for (let valIdx = 0; valIdx < council.length; valIdx++) {
      row += `,${voterScore(i, valIdx)}`;
    }
    row += "\n";
    fs.appendFileSync(fn, row);
  }
}

// column: slot, addr, voted, score
function output2(fn: string) {
  if (fs.existsSync(fn)) {
    throw new Error(`${fn} already exists`);
  }
  fs.writeFileSync(fn, `slot, addr, voted, score\n`);
  for (let i = 0; i <= period; i++) {
    for (let valIdx = 0; valIdx < council.length; valIdx++) {
      fs.appendFileSync(fn, `${i}, ${council[valIdx]}, ${voted(i, valIdx)}, ${voterScore(i, valIdx)}\n`);
    }
  }
}

// column: addr, total votes, total nonvotes
function output3(fn: string) {
  if (fs.existsSync(fn)) {
    throw new Error(`${fn} already exists`);
  }
  fs.writeFileSync(fn, `addr, total votes, total nonvotes, max nonvote cnts, final score\n`);
  for (let valIdx = 0; valIdx < council.length; valIdx++) {
    fs.appendFileSync(
      fn,
      `${council[valIdx]}, ${voteCnt(period, valIdx)}, ${nonVoteCnt(period, valIdx)}, ${maxNonVoteCntCons(
        period,
        valIdx,
      )}, ${voterScore(period, valIdx)}\n`,
    );
  }
}

async function main() {
  const blockNum = 126007200;
  council = await getCouncil(blockNum);
  const blockCacheFileName = `blocks_${hre.network.name}_${blockNum}.json`;
  if (!fs.existsSync(blockCacheFileName)) {
    throw new Error(`no block file named ${blockCacheFileName}`);
  }
  blockRecords = JSON.parse(fs.readFileSync(blockCacheFileName).toString());

  // output1(`output_${blockNum}_1.csv`);
  // console.log("log1 finished");
  // output2(`output_${hre.network.name}_${blockNum}_2.csv`);
  // console.log("log2 finished");
  output3(`output_${hre.network.name}_${blockNum}_3.csv`);
  console.log("log3 finished");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
