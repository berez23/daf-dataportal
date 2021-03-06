import React, { Component } from 'react';
import { Switch, Route, Redirect } from 'react-router-dom'
import { connect } from 'react-redux'
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter
} from 'reactstrap';
import { setCookie, setSupersetCookie, isEditor, isAdmin, isSysAdmin } from '../../utility'
import { toastr } from 'react-redux-toastr'
import { 
  receiveDatastory, 
  loginAction, 
  isValidToken, 
  receiveLogin, 
  getApplicationCookie, 
  logout, 
  fetchNotifications, 
  fetchNewNotifications, 
  search, 
  getSupersetUrl, 
  datasetDetail, 
  querySearch 
} from './../../actions.js'
import Header from '../../components/Header/';
import Sidebar from '../../components/Sidebar/';
import Breadcrumb from '../../components/Breadcrumb/';
import Aside from '../../components/Aside/';
import Footer from '../../components/Footer/';
import Home from '../../views/Home/Home';
import IngestionWizard from '../../views/IngestionWizard/';
import IngestionWizardNew from '../../views/IngestionWizard/IngestionWizardNew';
import Dataset from '../../views/Dataset/';
import DatasetList from '../../views/DataseList/';
import DatasetDetail from '../../views/DatasetDetail/DatasetDetail';
import UserStory from '../../views/UserStory/';
import Profile from '../../views/Profile/';
import Settings from '../../views/Settings/';
import DashboardManager from '../../views/DashboardManager/DashboardManager';
import Notifications from '../../views/Notifications/Notifications'
import Organizations from '../../views/Settings/Organizations';
import Users from '../../views/Settings/Users';
import Widgets from '../../views/Widgets/Widgets';
import SearchBar from '../../components/SearchBar/SearchBar';
import CreateWidget from '../../views/Widgets/CreateWidget'
import Messages from '../../views/Messages/Messages'
import EditTTL from '../../views/Messages/EditTTL'


import { serviceurl } from '../../config/serviceurl'

// semantic's containers imports
import Vocabularies from '../../semantics/containers/Vocabularies.js'
import Vocabulary from '../../semantics/containers/Vocabulary.js'
import Ontologies from '../../semantics/containers/Ontologies.js'
import Ontology from '../../semantics/containers/Ontology.js'
import Validator from '../../semantics/containers/Validator.js'
import IngestionWizardNewAdvanced from '../../views/IngestionWizard/IngestionWizardNewAdvanced';
import DatastoryManager from '../../views/Datastory/DatastoryManager';

const publicVapidKey = 'BI28-LsMRvryKklb9uk84wCwzfyiCYtb8cTrIgkXtP3EYlnwq7jPzOyhda1OdyCd1jqvrJZU06xHSWSxV1eZ_0o';

function PrivateRoute({ component: Component, authed, ...rest }) {
  return (
    <Route {...rest}
      render={(props) => authed === true
        ? <Component {...props} {...rest}/>
        : <Redirect to={{ pathname: '/login', state: { from: props.location } }} />}
    />
  )
}

function PrivateRouteAdmin({ component: Component, authed, loggedUser, ...rest }) {
  return (
    <Route
      {...rest}
      render={(props) => (authed === true && (isAdmin(loggedUser) || isSysAdmin(loggedUser)))
        ? <Component {...props} {...rest} />
        : <Redirect to={{ pathname: '/private/home', state: { from: props.location } }} />}
    />
  )
}

function PrivateRouteEditor({ component: Component, authed, loggedUser, ...rest }) {
  return (
    <Route
      {...rest}
      render={(props) => (authed === true && (isAdmin(loggedUser) || isEditor(loggedUser)))
        ? <Component {...props} {...rest}/>
        : <Redirect to={{ pathname: '/private/home', state: { from: props.location } }} />}
    />
  )
}

function PublicRoute({ component: Component, authed, ...rest }) {
  return (
    <Route
      {...rest}
      render={(props) => authed === false
        ? <Component {...props} {...rest} />
        : <Redirect to='/home' />}
    />
  )
}

function listenMessage(dispatch){
  if('serviceWorker' in navigator){
    // Handler for messages coming from the service worker
    navigator.serviceWorker.addEventListener('message', function(event){
      console.log(event.data);
        /* event.ports[0].postMessage("Client 1 Says 'Hello back!'"); */
        //dispatch(fetchNewNotifications(localStorage.getItem('user')))
    });
  }
}

function askPermission() {
  if(Notification&&Notification.permission === 'default' )
    return new Promise(function(resolve, reject) {
      const permissionResult = Notification.requestPermission(function(result) {
        resolve(result);
      });

      if (permissionResult) {
        permissionResult.then(resolve, reject);
      }
    })
    .then(function(permissionResult) {
      if (permissionResult !== 'granted') {
        throw new Error('We weren\'t granted permission.');
      }else if (permissionResult==='granted'){
        subscribeUserToPush()
      }
    });
}

async function subscribeUserToPush() {
  const registration = await navigator.serviceWorker.register('sw.js',  {scope: '/'})
  
  const subscribeOptions = {
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
  };

  const subscription = await registration.pushManager.subscribe(subscribeOptions);
  console.log('Received PushSubscription: ', JSON.stringify(subscription));
  await fetch(serviceurl.apiURLDatiGov + '/subscribe', {
    method: 'POST',
    body: JSON.stringify(subscription),
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + localStorage.getItem('token')
    }
  })
  .then(function(result){
    console.log(result)
  })
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function postUserToSw(username){
  if('serviceWorker' in navigator){
    const msg = {
      'type': 'register_user',
      'username': username
    }
    navigator.serviceWorker.controller.postMessage(msg);
  }
}

class Full extends Component {

  constructor(props){
    super(props)
    this.state = {
      open: false,
      isOpenStory: false,
      isOpenWidget: false,
      title: '',
      subtitle: '',
      org: '',
      widgetOrg: '',
      pvtWidget: '0',
      widgetTool: '0',
      widgetDataset: '',
      authed: false,
      loading: true,
      iframe: '',
      datasets: [],
      allOrganizations: []
    }


    this.openSearch = this.openSearch.bind(this)
    this.openModalStory = this.openModalStory.bind(this)
    this.hideModalStory = this.hideModalStory.bind(this)
    this.openModalWidget = this.openModalWidget.bind(this)
    this.hideModalWidget = this.hideModalWidget.bind(this)
    this.handleSaveStory = this.handleSaveStory.bind(this)
    this.openModalWidget = this.openModalWidget.bind(this)
    this.handleSaveWidget = this.handleSaveWidget.bind(this)
    this.startPoll = this.startPoll.bind(this)
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    const { dispatch } = this.props
    if (this.props.newNotifications !== nextProps.newNotifications) {
      clearTimeout(this.timeout);
      if (!nextProps.isNewFetching) {
          this.startPoll();
      }
    }
  }

/*   componentWillMount() {
    const { dispatch } = this.props
    if (localStorage.getItem('user'))
      //dispatch(fetchNewNotifications(localStorage.getItem('user')))
      //dispatch(fetchNotifications(localStorage.getItem('user'), 20))
  } */

  componentWillUnmount() {
    clearTimeout(this.timeout);
  }

  startPoll() {
    const { dispatch } = this.props
    this.timeout = setTimeout(() => {
      if (localStorage.getItem('username') && localStorage.getItem('token') &&
        localStorage.getItem('username') !== 'null' && localStorage.getItem('token') !== 'null') {
        dispatch(isValidToken(localStorage.getItem('token')))
        .then(ok=>{
          if(!ok){
            this.setState({
              authed: false,
              loading: false
            })
            logout();
            /* this.props.history.push('/login') */
            window.location.reload()
          }else{
            dispatch(fetchNewNotifications(this.props.loggedUser.uid))
          }
        })
        .catch((error) => {
          console.error(error)
          this.setState({
            authed: false,
            loading: false
          })
          logout();
            window.location.reload()
            /* this.props.history.push('/login') */
        })
      }
    }, 30000);
  }

  componentDidMount() {
    
    const { dispatch } = this.props

    listenMessage(dispatch)
    if (this.props.loggedUser && this.props.loggedUser.mail) {
      this.setState({
        authed: true,
        loading: false
      })
      askPermission(this.props.loggedUser.uid)
      dispatch(fetchNewNotifications(localStorage.getItem('user')))
      dispatch(fetchNotifications(this.props.loggedUser.uid, 20))
      // document.forms['supset_open'].submit()
    } else {
      if (localStorage.getItem('username') && localStorage.getItem('token') &&
        localStorage.getItem('username') !== 'null' && localStorage.getItem('token') !== 'null') {
        dispatch(isValidToken(localStorage.getItem('token')))
        .then(ok => {
          if (ok) {
            dispatch(getApplicationCookie('superset'))
            .then(json => {
              if (json) {
                setSupersetCookie(json)
              }
            })
            /* dispatch(getApplicationCookie('metabase'))
            .then(json => {
              if (json) {
                setCookie(json)
              }
            }) */
            /*dispatch(getApplicationCookie('jupyter'))
            .then(json => {
              if (json) {
                setCookie(json)
              }
            })*/
            /* dispatch(getApplicationCookie('grafana'))
            .then(json => {
              if (json) {
                setCookie(json)
              }
            })*/ 
            dispatch(loginAction())
            .then(response => {
              if (response.ok) {
                response.json().then(json => {
                  dispatch(receiveLogin(json))
                  askPermission(json.uid)
                  this.setState({
                    authed: true,
                    loading: false
                  })
                  dispatch(fetchNewNotifications(localStorage.getItem('user')))
                  dispatch(fetchNotifications(json.uid, 20))
                })
              }else{
                console.log('Login Action Response: ' + response.statusText)
                this.setState({
                  authed: false,
                  loading: false
                })
                this.props.history.push('/login?' + window.location)
              }
            })
          } else {
            this.setState({
              authed: false,
              loading: false
            })
            logout();
            this.props.history.push('/login?' + window.location)
          }
        })
        .catch((error) => {
          this.setState({
            authed: false,
            loading: false
          })
          logout();
          this.props.history.push('/login?' + window.location)
        })
      } else {
        this.setState({
          authed: false,
          loading: false
        })
        logout();
        this.props.history.push('/login?' + window.location)
      }
    }
  }

  openSearch(){
    this.setState({
      open: !this.state.open
    })
  }

  onPvtChangeWidget(e, value){
    const { dispatch } = this.props

    this.widgetOrg.value=''
    this.validateWidget(e);

    if(value==="0"){
      let filter = {
        'text': "",
        'index': ['catalog_test'],
        'org': [],
        'theme':[],
        'date': "",
        'status': ['2'],
        'order': "desc"
      }

      dispatch(querySearch(filter))
      .then(json => {
        var orgs = json.filter(res =>{
          return(res.type==='organization')
        })

        this.setState({
          pvtWidget: value,
          widgetOrg: '',
          errorMSgTable:false,
          allOrganizations: Object.keys(JSON.parse(orgs[0].source))
        })
      })
    }else{
      this.setState({
        pvtWidget: value,
        widgetOrg: '',
        errorMSgTable:false
    });
    }

  }

  onChangeWidgetTool(e, value){
    this.setState({
        widgetTool: value,
        errorMSgTable:false

    });
    this.validateWidget(e);
  }

  onOrganizationChangeWidget(e, value){
    const { dispatch } = this.props
    this.setState({
      errorMSgTable:false
    });
    var status = []
    if(this.state.pvtWidget==='1')
      status = ['0','1']
    else
      status = ['2']

    let filter = {
        'text': "",
        'index': ['catalog_test'],
        'org': [value],
        'theme':[],
        'date': "",
        'status': status,
        'order': "desc"
    }
    //let filter = {'text':'','index':index,'org':[org],'theme':[],'date':'','status':[],'order':'desc'}
    dispatch(search('', filter, false, filter))    
    .then(response => {
      this.setState({
        widgetOrg: value,
        widgetDataset: ''
      }
    )
    })
    .catch(error=>{console.log('Errore nel caricamento dei dataset: ' + error)})
    this.validateWidget(e);
  }

  onDatasetChangeWidget(e, value){
    this.setState({
      widgetDataset: value,
      errorMSgTable:false
    });
    this.validateWidget(e);
  }
  

  validateWidget = (e) => {
    e.preventDefault()
/*     if(!this.titleWidget.value){
      this.setState({
        validationMSg: 'Campo obbligatorio'
      });
    }else{
      this.setState({
        validationMSg: null
      });
    } */

     if(!this.widgetDataset || this.widgetDataset.value == ''){
      this.setState({
        validationMSgDataset: 'Campo obbligatorio'
      });
    }else{
      this.setState({
        validationMSgDataset: null
      });
    }

    if(!this.widgetOrg || this.widgetOrg.value == ''){
      this.setState({
        validationMSgOrgWidget: 'Campo obbligatorio'
      });
    }else{
      this.setState({
        validationMSgOrgWidget: null
      });
    }
  }

  validateStory = (e) => {
    e.preventDefault()
    if(!this.titleStory.value){
      this.setState({
        validationMSg: 'Campo obbligatorio'
      });
    }else{
      this.setState({
        validationMSg: null
      });
    }

     if(!this.orgStory || this.orgStory.value == ''){
      this.setState({
        validationMSgOrg: 'Campo obbligatorio'
      });
    }else{
      this.setState({
        validationMSgOrg: null
      });
    }
  }
  
  openModalStory = () => {
    this.setState({
      isOpenStory: true,
      title: '',
      subtitle: '',
      org: ''
    });
  };
  
  hideModalStory = () => {
    this.setState({
      isOpenStory: false,
      title: '',
      subtitle: '',
      org: ''
    });
  };

  openModalWidget = () => {
    const { dispatch } = this.props

    //this.titleWidget.value = ''
    this.pvtWidget.value = ""
    this.widgetTool.value = 0
    this.widgetOrg.value=''
    //this.widgetDataset.value=''

    this.setState({
      /* allOrganizations: json.elem, */
      pvtWidget:"",
      widgetTool:0,
      widgetOrg:'',
      validationMSgDataset: 'Campo obbligatorio',
      validationMSg: 'Campo obbligatorio',
      validationMSgOrgWidget: 'Campo obbligatorio',
      errorMSgTable:false,
      isOpenWidget: true
    })

  };
  
  hideModalWidget = () => {
    this.setState({
      isOpenWidget: false
    });
  };

  hideModalWidgetAndRedirect = () => {
    const { dispatch } = this.props
    this.setState({
      isOpenWidget: false
    });
    this.props.history.push('/private/dataset/'+this.state.widgetDataset)
    dispatch(datasetDetail(this.state.widgetDataset,'', false))
  };

  /**
  * Save Story
  */
  handleSaveStory = (e) => {
    const { title, subtitle, org } = this.state
    const { dispatch, loggedUser } = this.props

    var organization = org
    
    if(loggedUser.organizations.length === 0){
      organization = 'open_data_group'
    }

    if(title.length>0 && organization.length>0){
      //save data
      let request = {
        title: title,
        subtitle: subtitle,
        org: organization,
        layout: [],
        widgets: [],
        status: 0
      };
      dispatch(receiveDatastory(request))
      this.setState({
        isOpenStory: false,
        title: '',
        subtitle: '',
        org: ''
      })

      this.props.history.push({
        'pathname':'/private/datastory/create',
        'modified':true
      })
    }
  }

  handleSaveWidget = (e) => {
    this.setState({
      errorMSgTable:false
    });
    e.preventDefault()
    console.log('handleSaveWidget')
    const { dispatch } = this.props
    dispatch(getSupersetUrl(widgetDataset.value, widgetOrg.value, !pvtWidget))
    .then(json => {
      if(json.length>0){
        let tableId = json[0].id
        window.open(serviceurl.urlSuperset + '/superset/explore/table/' + tableId)
        this.setState({
          isOpenWidget:false
        });
      } else {
        this.setState({
          errorMSgTable:true
        });
      }
    })
  }

  render() {
    const { history, loggedUser, results } = this.props
    const { allOrganizations } = this.state
/*     const divStyle = {
      'paddingLeft': '10px',
      'paddingRigth': '0px',
    }; */
    let mainDiv = 'bg-white'
    let home = ''
    let paddingTop = 'pt-3'

    if (window.location.hash.indexOf('/private/userstory/list')!==-1 || 
        window.location.hash.indexOf('private/widget')!==-1 || 
        window.location.hash.indexOf('private/vocabularies')!==-1 || 
        window.location.hash.indexOf('private/ontologies')!==-1 || 
        window.location.hash.indexOf('private/notifications')!==-1)
      mainDiv='bg-light'
      
    if (window.location.hash.indexOf('/private/home')!==-1 || window.location.hash.indexOf('/private/search')!==-1 || window.location.hash.indexOf('/private/dataset')!==-1)
      home = 'p-0'

    if (window.location.hash.indexOf('/private/home')!==-1)
      paddingTop = ''
    
    if (window.location.hash.indexOf('/private/dataset/')!==-1)
      paddingTop = ''

    if (this.props.authed)
      this.state.authed = true;  
    return (
    <div> 
      { this.state.loading && (<h1 className="text-center fixed-middle"><i className="fas fa-circle-notch fa-spin mr-2"/>Caricamento</h1>)} 
      {!this.state.loading && <div className="app aside-menu-show">
      {/* Modal per creazione nuova Storia */}
      {loggedUser && <Modal isOpen={this.state.isOpenStory} toggle={this.hideModalStory}>
          <form>
            <ModalHeader toggle={this.hideModalStory}>
              Crea una Storia
            </ModalHeader>
            <ModalBody>
            <div className="form-group">
                <div className="form-group row">
                  <label className="col-md-2 form-control-label">Titolo</label>
                  <div className="col-md-9">
                    <input type="text" className={"form-control "+(this.state.title.length===0?'is-invalid':'')} onChange={(e)=> this.setState({title: e.target.value})} value={this.state.title} placeholder="Titolo"/>
                    {this.state.title.length===0&&<span className="text-danger">Campo Obbligatorio</span>}
                  </div>
                </div>
                <div className="form-group row">
                  <label className="col-md-2 form-control-label">Sottotitolo</label>
                  <div className="col-md-9">
                    <input type="text" className="form-control" onChange={(e)=> this.setState({subtitle: e.target.value})} value={this.state.subtitle} placeholder="Sottotitolo"/>
                  </div>
                </div>
                <div className="form-group row">
                  <label className="col-md-2 form-control-label">Organizzazione</label>
                  {loggedUser.organizations && loggedUser.organizations.length > 0 &&<div className="col-md-9">
                    <select className={"form-control "+(this.state.org.length===0?'is-invalid':'')} placeholder="Seleziona l'organizzazione" onChange= {(e) => this.setState({org: e.target.value})} value={this.state.org} >
                        <option value=""  key='organization' defaultValue></option>
                        {loggedUser.organizations.map(organization => {
                              return(
                                <option value={organization} key={organization}>{organization}</option>)
                          }
                        )}
                    </select>
                    
                    {this.state.org.length===0 && <span className="text-danger">Campo Obbligatorio</span>}
                  </div>}
                  {
                      !loggedUser.organizations || loggedUser.organizations.length === 0 && <div className="col-md-9">
                          La tua datastory sarà associata all'organizzazione di default per gli OpenData
                        </div>
                    }
                </div>
            </div>
            </ModalBody>
            <ModalFooter>
              <button type="button" className='btn btn-gray-200' onClick={()=>this.setState({isOpenStory: false})}>
                Chiudi
              </button>
              <button type="button" className="btn btn-primary px-2" onClick={this.handleSaveStory.bind(this)}>
                <span className="glyphicon glyphicon-plus" aria-hidden="true"></span>
                  Crea
              </button>
            </ModalFooter>
          </form>
        </Modal>}

        {/* Modal per creazione nuova Dash */}

        {/* loggedUser && <Modal isOpen={this.state.isOpenDash} toggle={this.hideModalDash}>
          <form>
            <ModalHeader toggle={this.hideModalDash}>
              Crea una Dashboard
            </ModalHeader>
            <ModalBody>
            <div className="form-group">
                <div className="form-group row">
                  <label className="col-md-2 form-control-label">Titolo</label>
                  <div className="col-md-8">
                    <input type="text" className="form-control" ref={(titleDash) => this.titleDash = titleDash} onChange={this.validateDash.bind(this)} id="title" placeholder="Titolo"/>
                    {this.state.validationMSg && <span>{this.state.validationMSg}</span>}
                  </div>
                </div>
                <div className="form-group row">
                  <label className="col-md-2 form-control-label">Sottotitolo</label>
                  <div className="col-md-8">
                    <input type="text" className="form-control" ref={(subtitleDash) => this.subtitleDash = subtitleDash} id="subtitle" placeholder="Sottotitolo"/>
                  </div>
                </div>
                <div className="form-group row">
                  <label className="col-md-2 form-control-label">Privata</label>
                  <div className="col-md-8">
                  {loggedUser.organizations && loggedUser.organizations.length > 0 ?
                    <select className="form-control" ref={(pvtDash) => this.pvtDash = pvtDash} onChange={(e) => this.onPvtChangeDash(e, e.target.value)} id="pvt" >
                      <option value="0" defaultValue key="0">No</option>
                      <option value="1" key='1'>Si</option>
                    </select>
                    :
                    <div>
                      <select className="form-control" ref={(pvtDash) => this.pvtDash = pvtDash} onChange={(e) => this.onPvtChangeDash(e, e.target.value)} id="pvt" >
                        <option value="0" defaultValue key="0">No</option>
                      </select>
                      <span>Puoi creare soltanto dashboards pubbliche in quanto non hai nessuna organizzazione associata</span>
                    </div>
                  }
                  </div>
                </div>
                <div className="form-group row">
                  <label className="col-md-2 form-control-label">Organizzazione</label>
                  <div className="col-md-8">
                    <select className="form-control" ref={(orgDash) => this.orgDash = orgDash} onChange={(e) => this.onOrganizationChangeDash(e, e.target.value)} id="org" >
                        <option value=""  key='organization' defaultValue></option>
                        {loggedUser.organizations && loggedUser.organizations.length > 0 && loggedUser.organizations.map(organization => {
                            return (<option value={organization} key={organization}>{organization}</option>)
                        })
                        }
                    </select>
                    {this.state.validationMSgOrg && <span>{this.state.validationMSgOrg}</span>}
                  </div>
                </div>
            </div>
            </ModalBody>
            <ModalFooter>
              <button type="button" className='btn btn-gray-200' onClick={this.hideModalDash}>
                Chiudi
              </button>
              <button type="button" className="btn btn-primary px-2" onClick={this.handleSaveDash.bind(this)}>
                <span className="glyphicon glyphicon-plus" aria-hidden="true"></span>
                  Crea
              </button>
            </ModalFooter>
          </form>
        </Modal> */}

        <Header history={history} openSearch={this.openSearch} openModalStory={this.openModalStory} openModalDash={this.openModalDash} openModalWidget={this.openModalWidget} />
        <div className="app-body">
          {loggedUser && <Sidebar {...this.props} openModalStory={this.openModalStory} openModalDash={this.openModalDash} openModalWidget={this.openModalWidget} />}
          <main className={"main mr-0 "+mainDiv}>
            {this.state.open && <SearchBar history={history} open={this.state.open}/>}
            <Breadcrumb />
            <div className={paddingTop+ " container-fluid "+home }>
              <Switch>
                <PrivateRoute authed={this.state.authed} path="/private/home" name="Home" exact component={Home}/>
                <PrivateRouteEditor authed={this.state.authed} loggedUser={loggedUser} path="/private/ingestionwizzardnew" name="Forms" component={IngestionWizard} history={history} />
                <PrivateRouteEditor authed={this.state.authed} loggedUser={loggedUser} path="/private/ingestionwizzard" name="Forms" component={IngestionWizardNew} history={history} />
                <PrivateRouteEditor authed={this.state.authed} loggedUser={loggedUser} path="/private/advancedingestionwizzard" name="Forms" component={IngestionWizardNewAdvanced} history={history} />
                <PrivateRoute authed={this.state.authed} path="/private/ontologies/" name="Ontologies" exact component={Ontologies} />
                <PrivateRoute authed={this.state.authed} path="/private/ontologies/:filter" name="Ontology" component={Ontology} />
                <PrivateRoute authed={this.state.authed} path="/private/vocabularies" name="Vocabularies" exact component={Vocabularies} />
                <PrivateRoute authed={this.state.authed} path="/private/vocabularies/:filter" name="Vocabulary" component={Vocabulary} />
                <PrivateRoute authed={this.state.authed} path="/private/validator" name="Validator" exact component={Validator} />
                <PrivateRoute authed={this.state.authed} path="/private/dashboard" name="Dashboard manager" component={DashboardManager} />
                <PrivateRoute authed={this.state.authed} path="/private/notifications" name="Notification Center" component={Notifications} />
                <PrivateRoute authed={this.state.authed} path="/private/userstory" name="User Story" component={UserStory} />
                <PrivateRoute authed={this.state.authed} path="/private/widget" name="Widget" component={Widgets} openModalWidget={this.openModalWidget} />
                <PrivateRoute authed={this.state.authed} exact path="/private/dataset_old" name="Dataset" component={Dataset} />
                <PrivateRoute authed={this.state.authed} exact path="/private/dataset" name="Dataset" component={DatasetList} />
                <PrivateRoute authed={this.state.authed} exact path="/private/search" name="Search" component={DatasetList} />
                <PrivateRoute authed={this.state.authed} exact path="/private/dataset/:id" name="Dataset Detail" component={DatasetDetail} />
                <PrivateRoute authed={this.state.authed} path="/private/profile" name="Profile" component={Profile} />
                <PrivateRoute authed={this.state.authed} path="/private/charts" name="Test" component={CreateWidget} />
                <PrivateRoute authed={this.state.authed} path="/private/datastory" name="Data story" component={DatastoryManager} />
                <PrivateRouteAdmin authed={this.state.authed} loggedUser={loggedUser} path="/private/settings" name="Settings" component={Settings} />
                <PrivateRouteAdmin authed={this.state.authed} loggedUser={loggedUser} path="/private/organizations" name="Organizations" component={Organizations} />
                <PrivateRouteAdmin authed={this.state.authed} loggedUser={loggedUser} path="/private/users" name="Users" component={Users} />
                <PrivateRouteAdmin authed={this.state.authed} loggedUser={loggedUser} path="/private/messages" name="Messaggi" component={Messages} />
                <PrivateRouteAdmin authed={this.state.authed} loggedUser={loggedUser} path="/private/editTTL" name="editTTL" component={EditTTL} />
                <Redirect from="/private" to="/private/home"/>
              </Switch>
            </div>
          </main>
          <Aside history={history}/>
        </div>
        <Footer />
      </div>
      }
    </div>
    )
  }
}

function mapStateToProps(state) {
  const loggedUser = state.userReducer['obj']?state.userReducer['obj'].loggedUser:{ }
  const { notifications, isFetching, isNewFetching, newNotifications } = state.notificationsReducer['notifications'] || {}
  const { results } = state.searchReducer['search'] || { isFetching: false, results: [] }
  return { loggedUser, notifications, isFetching, newNotifications, isNewFetching, results }
}

export default connect(mapStateToProps)(Full);
