package main

import (
	"fmt"
	"os"
	"time"

	"github.com/klaytn/klaytn/cmd/utils"
	"github.com/klaytn/klaytn/cmd/utils/nodecmd"
	"github.com/klaytn/klaytn/networks/p2p"
	"github.com/klaytn/klaytn/networks/p2p/discover"
	"gopkg.in/urfave/cli.v1"
)

func setUp(ctx *cli.Context) {
	if len(ctx.GlobalString(utils.NodeKeyHexFlag.Name)) != 64 {
		ctx.Set(utils.NodeKeyHexFlag.Name, "000000000000000000000000000000000000000000000000000000000000dead")
		fmt.Println("Setting nodekeyhex to default")
	}
	_, klayConfig := utils.MakeConfigNode(ctx)

	server := p2p.NewServer(klayConfig.Node.P2P)
	node, _ := discover.ParseNode("kni://8318535b54105d4a7aae60c08fc45f9687181b4fdfc625bd1a753fa7397fed753547f11ca8696646f2f3acb08e31016afac23e630c5d11f59f61fef57b0d2aa5@3.38.95.49:32324?discport=0&ntype=cn")

	ch := make(chan *p2p.PeerEvent)
	server.SubscribeEvents(ch)
	go func() {
		for {
			select {
			case v := <-ch:
				fmt.Println("message received!!!", v)
			default:
				time.Sleep(2 * time.Second)
			}
		}
	}()
	// server.AddProtocols([]p2p.Protocol{})

	err := server.Start()
	if err != nil {
		panic(err)
	}

	server.AddPeer(node)
	time.Sleep(2 * time.Second)

	fmt.Println(server.PeersInfo())
	fmt.Println(server.Peers())

	time.Sleep(10 * time.Second)

	// fmt.Println(server)
	// fmt.Println(server.GetProtocols())

	/*
		peer = cn.Peer
		peer.Handshake(pm.networkId, pm.getChainID(), td, hash, genesis.Hash())
		peer.RequestHeadersByHash()
		peer.FetchBlockHeader()
		peer.GetRW().ReadMsg()
		p2p.Send()
	*/
}

func main() {
	app := utils.NewApp(nodecmd.GetGitCommit(), "The command line interface for Klaytn Consensus Node")
	app.Action = setUp
	app.Flags = nodecmd.KenAppFlags()

	if err := app.Run(os.Args); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
