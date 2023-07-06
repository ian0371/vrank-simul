package main

import (
	"fmt"
	"os"
	"reflect"
	"unsafe"

	"github.com/klaytn/klaytn/accounts"
	"github.com/klaytn/klaytn/cmd/utils"
	"github.com/klaytn/klaytn/cmd/utils/nodecmd"
	"github.com/klaytn/klaytn/event"
	"github.com/klaytn/klaytn/node"
	"github.com/klaytn/klaytn/node/cn"
	"github.com/klaytn/klaytn/params"
	"gopkg.in/urfave/cli.v1"
)

func GetUnexportedField(field reflect.Value) interface{} {
	return reflect.NewAt(field.Type(), unsafe.Pointer(field.UnsafeAddr())).Elem().Interface()
}

func setUp(ctx *cli.Context) error {
	n, klayConfig := utils.MakeConfigNode(ctx)
	nodeConf := GetUnexportedField(reflect.ValueOf(n).Elem().FieldByName("config")).(*node.Config)
	eventmux := GetUnexportedField(reflect.ValueOf(n).Elem().FieldByName("eventmux")).(*event.TypeMux)
	accman := GetUnexportedField(reflect.ValueOf(n).Elem().FieldByName("accman")).(*accounts.Manager)
	servicectx := node.NewServiceContext(nodeConf, make(map[reflect.Type]node.Service), eventmux, accman)
	cn, _ := cn.New(servicectx, &klayConfig.CN)

	fmt.Println(GetUnexportedField(reflect.ValueOf(cn).Elem().FieldByName("chainConfig")).(*params.ChainConfig))
	return nil
}

func main() {
	app := utils.NewApp(nodecmd.GetGitCommit(), "The command line interface for Klaytn Consensus Node")
	app.Action = setUp
	app.Flags = nodecmd.KcnAppFlags()

	if err := app.Run(os.Args); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	/*

		mdb := database.NewMemoryDBManager()


		config := utils.KlayConfig{
			CN:               *cn.GetDefaultConfig(),
			Node:             utils.DefaultNodeConfig(),
			DB:               *dbsyncer.DefaultDBConfig(),
			ChainDataFetcher: *chaindatafetcher.DefaultChainDataFetcherConfig(),
			ServiceChain:     *sc.DefaultServiceChainConfig(),
		}
		cacheConfig := DefaultCacheConfig(config.CN)
		vmConfig := DefaultVMConfig(config.CN)
		chainConfig := params.CypressChainConfig
		cn.CreateConsensusEngine(ctx, config, chainConfig, chainDB, governance, ctx.NodeType())

		bc = blockchain.NewBlockChain(mdb, cacheConfig, parmas.CypressChainConfig, engine, vmConfig)

		bc.NewBlockChain(mdb, cacheConfig, chainConfig, cn.engine, vmConfig)
		// cn.txPool = blockchain.NewTxPool(config.TxPool, cn.chainConfig, bc)

		cn.NewProtocolManager(params.CypressChainConfig, downloader.FullSync, params.CypressNetworkId,
			nil, nil, nil,
			nil, nil, 1,
			-1, &cn.Config{},
		)
	*/

	// config *params.ChainConfig, mode downloader.SyncMode, networkId uint64,
	// mux *event.TypeMux, txpool work.TxPool, engine consensus.Engine,
	// blockchain work.BlockChain, chainDB database.DBManager, cacheLimit int,
	//	nodetype common.ConnType, cnconfig *Config,
}
