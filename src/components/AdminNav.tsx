import { Link } from 'react-router-dom'

function AdminNav() {
  return (
    <nav>
      <ul>
        <li>
          <Link to="/admin/products">Produits</Link>
        </li>
        <li>
          <Link to="/admin/meetings">Rendez-vous</Link>
        </li>
      </ul>
    </nav>
  )
}

export default AdminNav

