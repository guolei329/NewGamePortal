import * as React from 'react';
import { Contact } from '../types';
import { MatchInfo } from '../types';
import { List, ListItem } from 'material-ui/List';
import Divider from 'material-ui/Divider';
import Subheader from 'material-ui/Subheader';
import FloatingActionButton from 'material-ui/FloatingActionButton';
import RaisedButton from 'material-ui/RaisedButton';
import ContentAdd from 'material-ui/svg-icons/content/add';
import AutoComplete from 'material-ui/AutoComplete';
import { ourFirebase } from '../services/firebase';

const style = {
  marginRight: 20
};

interface ContactWithUserId extends Contact {
  userId: string;
}

interface Props {
  matchesList: MatchInfo[];
  users: ContactWithUserId[];
  notUsers: Contact[];
  allUsers: String[];
  match: any;
  myUserId: string;
  history: any;
}

class ContactsList extends React.Component<Props, {}> {
  state = {
    filterValue: '',
    userAdded: false
  };

  handleRequest = (chosenRequest: string, index: number) => {
    if (chosenRequest.length > 0) {
      this.setState({ filterValue: chosenRequest });
    }
    console.log(chosenRequest.length);
    return index;
  };

  handleUpdate = (searchText: string, dataSource: any[]) => {
    if (searchText.length === 0) {
      this.setState({ filterValue: '' });
    }
    console.log(dataSource.length);
  };

  handleAddUser = () => {
    let currentMatchId: String = this.props.match.params.matchId;
    let currentMatch: MatchInfo;
    this.props.matchesList.map((match: MatchInfo) => {
      if (match.matchId === currentMatchId) {
        currentMatch = match;
        ourFirebase.addParticipant(currentMatch, this.props.myUserId);
      }
    });
    this.props.history.push('/matches/' + currentMatchId);
  };

  handleAddNotUser = () => {
    console.log(this.props.matchesList);
  };

  filterContacts(contacts: Contact[]) {
    return contacts.filter(
      contact => contact.name.indexOf(this.state.filterValue) !== -1
    );
  }

  render() {
    return (
      <div>
        <br />
        <AutoComplete
          floatingLabelText="Search"
          filter={AutoComplete.fuzzyFilter}
          dataSource={this.props.allUsers}
          maxSearchResults={5}
          onNewRequest={this.handleRequest}
          onUpdateInput={this.handleUpdate}
        />
        <List>
          <Subheader>Game User</Subheader>
          {this.filterContacts(this.props.users).map((user: Contact) => (
            <ListItem
              key={user.phoneNumber}
              primaryText={user.name}
              rightIconButton={
                <FloatingActionButton
                  mini={true}
                  style={style}
                  onClick={this.handleAddUser}
                >
                  <ContentAdd />
                </FloatingActionButton>
              }
            />
          ))}
        </List>
        <Divider />
        <List>
          <Subheader>Not Game User</Subheader>
          {this.filterContacts(this.props.notUsers).map((user: Contact) => (
            <ListItem
              key={user.phoneNumber}
              primaryText={user.name}
              rightIconButton={
                <RaisedButton
                  label="invite"
                  primary={true}
                  style={style}
                  onClick={this.handleAddNotUser}
                />
              }
            />
          ))}
        </List>
      </div>
    );
  }
}

import { connect } from 'react-redux';
import { StoreState } from '../types/index';

const mapStateToProps = (state: StoreState) => {
  const users: ContactWithUserId[] = [];
  const notUsers: Contact[] = [];
  const allUsers: String[] = [];
  const phoneNumbers = Object.keys(state.phoneNumberToContact);
  for (let phoneNumber of phoneNumbers) {
    const contact = state.phoneNumberToContact[phoneNumber];
    const userId =
      state.userIdsAndPhoneNumbers.phoneNumberToUserId[phoneNumber];
    if (userId === state.myUser.myUserId) {
      // Ignore my user (in case I have my own phone number in my contacts)
    } else if (userId) {
      users.push({ ...contact, userId: userId });
      allUsers.push(contact.name);
    } else {
      notUsers.push(contact);
      allUsers.push(contact.name);
    }
  }

  users.sort((c1, c2) => c1.name.localeCompare(c2.name));
  notUsers.sort((c1, c2) => c1.name.localeCompare(c2.name));
  return {
    users,
    notUsers,
    allUsers,
    matchesList: state.matchesList,
    myUserId: state.myUser.myUserId
  };
};
// Later this will take dispatch: any as argument
const mapDispatchToProps = () => ({});

export default connect(mapStateToProps, mapDispatchToProps)(ContactsList);
