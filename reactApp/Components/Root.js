import React from 'react';
import { Router, Route, Switch } from 'react-router';
import Login from './Login.js'
import Directory from './Directory';
import MyEditor from './MyEditor'
import Register from './Register.js'


class Root extends React.Component {
  constructor(props){
    super(props);
    this.state = {
      loggedIn: false
    }
  }
 

  render() {
    return (
      <Router history={this.props.history}  store={this.props.store}>


          <Switch>
              <Route exact path="/" render={(props) => <Login store={this.props.store}/>}/>
              <Route exact path="/register" render={(props) => <Register store={this.props.store}/>}/>
              <Route exact path="/directory/" render={(props) => <Directory store={this.props.store}/>} />
              <Route path="/editor/:docId" render={(props) => <MyEditor {...props} store={this.props.store}/>} />
              <Route path ="/" component={Login}/>
          </Switch>
      </Router>
    );
  }
};

export default Root;
