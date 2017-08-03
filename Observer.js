var data = {
  name:'kingdeng'
};
observe(data);
data.name = "dmp";
//提示一些简单信息
function deepclone(obj){
  var newobj = {};
  for(key in obj){
   if(typeof obj[key] === 'object'){
      deepclone(obj[key]);
   }else{
     newobj[key] = obj[key];
   }
  }
  return newobj;
}
function observe(data){
  if(!data || typeof data !== 'object'){
    return;
  }
  //遍历所有属性
  Object.keys(data).forEach( (key) => {
      defineReactive(data,key,data[key]);
  });

};

function defineReactive(data,key,val){
  //下面是消息订阅模式，维护一个数组，用来收集订阅者，一旦数据发生了变化，就通知
  //订阅者进行更新
      var dep = new Dep();
   observe(val); //监听子属性
   Object.defineProperty(data,key,{
       enumerable:true, //可以枚举
       configurable:false, //不能重新进行定义
       get: function(){
         //由于需要在闭包内添加订阅者，所以通过Dep定义一个
         //全局target属性，暂存watcher，添加完进行移除
         Dep.target && dep.addDep(Dep.target);
         return val;
       },
       set: function(newVal){
         console.log('哈哈，监听到了数值发生了变化',val,'-->',newVal);
         val = newVal;
         //通知所有订阅者
         dep.notify();
       }

   });
}

function Dep(){
  this.subs = [];
}

Dep.prototype = {
   addSub: function(sub){
     //这个函数用来增加订阅者
     this.subs.push(sub);
   },
   notify: function(){
   //用来通知订阅者进行更新
   this.subs.forEach( (sub) => {

     sub.update(); //订阅者进行更新
   });

   }

}
//实现订阅者
Watcher.prototype = {
  get: function(key){
    Dep.target = this; //Dep的target属性去暂存watcher
    this.value = data[key];
    Dep.target = null;

  }

}

function Compile(el){
  this.$el = this.isElementNode(el) ? el : document.querySelector(el);
  if(this.$el){
    this.$fragment = this.node2Fragment(this.$el);
    this.init();
    this.$el.appendChild(this.$fragment);
  }
}

Compile.prototype = {
  init: function(){
    this.compileElement(this.$fragment);
  },
  node2Fragment: function(el){
    var fragment = document.createDocumentFragment(),child;
    //将原生节点拷贝到fragment
    while(child = el.firstChild){
      fragment.appendChild(child);
    }
    return fragment;
  },
  compileElement: function(e){
    var childNodes = el.childNodes,me = this;
    [].slice.call(childNodes).forEach( (node) => {
      var text = node.textContent;
      var reg = /\{\{(.*)\}\}/;  //表达式文本
      //按照元素节点编译
      if(me.isElementNode(node)){
        me.compile(node);
      }els if(me.isTextNode(node) && reg.test(text)){
        me.compileText(node,RegExp.$1);
      }
      //遍历编译所有子节点
      if(node.childNodes && node.childNodes.length){
        me.compileElement(node);
      }

    });
  },

  compile: function(node){
   var nodeAttrs = node.attributes,me = this;
   [].slice.call(nodeAttrs).forEach( (attr) => {
      //规定：指令必须以v-xxx开头
      var attrName = attr.name;
      if(me.isDirective(attrName)){
        var exp = attr.value;
        var dir = attrName.substring(2);//text
        if(me.isEventDirective(dir)){
            //事件指令，例如 v-on:click
            compileUtil.eventHandler(node,me.$vm,exp,dir);
        }else{
          //普通指令
          compileUtil[dir] && compileUtil[dir](node,me.$vm,exp);
        }
      }

   });

  }
};

//指令处理集合
var compileUtil = {
    text: function(node,vm,exp){
      this.bind(node,vm,exp,'text');
    },
    bind: function(node,vm,exp,dir){
      var updaterFn = updater[dir+'Updater'];
      //第一次更新视图
      updaterFn && updaterFn(node,vm[exp]);
      //实例化订阅者，此操作在对应的属性消息订阅器中添加了该订阅者watcher
      new Watcher(vm,exp,function(value,oldValue){
        //一旦属性发生了变化，会收到通知执行此更新函数，更新视图
        updaterFn && updaterFn(node,value,oldValue);
      });
    }

};

//更新函数
var updater = {
  textUpdater: function(node,value){
    node.textContent = typeof value == "undefined"? "":value;
  }
}

//实现watcher 1.自身能想属性订阅器中添加自己
//2 自身必须具有一个update()方法
//3.等待属性变动dep.notice()通知时，能自动调用update()方法，并处罚Compile中绑定的回调
function Watcher(vm,exp,cb){
  this.cb = cb;
  this.vm = vm;
  this.exp = exp;
  //此处为了触发属性的getter,从而在dep添加自己，结合Observer
  this.value = this.get();
}

Watcher.prototype = {
   value: function(){
     this.run();//属性变化收到通知
   },
   run:function(){
     var value = this.get();//收取新的值
     var oldValue = this.value;
     if(value != oldValue){
       this.value = value;
       this.cb.call(this.vm,value,oldValue);
     }
   },
   get: function(){
     Dep.target  = this;// 将当前订阅之指向自己
     var value = this.vm[exp]; //触发getter，添加自己到属性订阅之器中
     Dep.target = null;//添加完毕，重新指控
     return value;
   }

}

function MVVM(options) {
    this.$options = options;
    var data = this._data = this.$options.data, me = this;
    // 属性代理，实现 vm.xxx -> vm._data.xxx
    Object.keys(data).forEach(function(key) {
        me._proxy(key);
    });
    observe(data, this);
    this.$compile = new Compile(options.el || document.body, this)
}

MVVM.prototype = {
	_proxy: function(key) {
		var me = this;
        Object.defineProperty(me, key, {
            configurable: false,
            enumerable: true,
            get: function proxyGetter() {
                return me._data[key];
            },
            set: function proxySetter(newVal) {
                me._data[key] = newVal;
            }
        });
	}
};
