import { ethers } from "hardhat";
import { Header, commiterAddress, parseExtraData } from "../lib/hardhat/utils";
import * as fs from "fs";

const period = 3600;
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
async function fillRecords(startBlock: number, endBlock: number, fn: string) {
  if (startBlock % period != 0) {
    throw new Error("startBlock must be multiple of period");
  }

  for (let block = startBlock; block <= endBlock; block++) {
    const record = await getRecord(block);
    blockRecords.push(record);
    if (block % 100 == 0) {
      console.log(`Downloading ${block}`);
      fs.writeFileSync(fn, JSON.stringify(blockRecords));
    }
  }
}

async function main() {
  const blockNum = 126007200;
  council = await getCouncil(blockNum);

  const outputDir = "downloads";
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  const blockCacheFileName = `${outputDir}/blocks_${hre.network.name}_${blockNum}.json`;
  if (fs.existsSync(blockCacheFileName)) {
    throw new Error(`${blockCacheFileName} already exists`);
  }

  await fillRecords(blockNum, blockNum + period, blockCacheFileName);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
